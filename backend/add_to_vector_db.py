import os
import re
import uuid
import time
import math
import random
from typing import Generator, List, Tuple
from openai import OpenAI
from supabase import create_client
from dotenv import load_dotenv
import psycopg2
from psycopg2 import sql
from psycopg2 import extras
from pgvector.psycopg2 import register_vector
from pgvector import Vector

# python-docx and PyMuPDF (fitz) are required.
try:
    from docx import Document as DocxDocument
except Exception as e:
    DocxDocument = None

try:
    import fitz  # PyMuPDF
except Exception as e:
    fitz = None

import unicodedata

# ---------- improved cleaner ----------
def clean_text_for_db(s: str, max_len: int = 10000) -> str:
    """Remove NUL and other unprintable/control unicode characters, normalize, and truncate.
    Keeps readable whitespace (tab, newline). Truncates to max_len characters if needed.
    """
    if s is None:
        return None

    # Remove explicit NUL bytes
    s = s.replace("\x00", "")

    # Normalize first to avoid weird decomposed characters
    s = unicodedata.normalize("NFC", s)

    cleaned_chars = []
    for ch in s:
        # allow tab/newline/carriage return
        if ch in ("\t", "\n", "\r"):
            cleaned_chars.append(ch)
            continue
        cat = unicodedata.category(ch)
        # skip other/control characters (categories starting with 'C')
        if cat.startswith("C"):
            continue
        # (optionally) restrict extremely weird whitespace categories; keep normal spaces
        cleaned_chars.append(ch)

    out = "".join(cleaned_chars)

    # collapse repeated whitespace to single spaces where appropriate (but preserve newlines)
    out = re.sub(r"[ \t\f\v]{2,}", " ", out)

    # Trim leading/trailing whitespace
    out = out.strip()

    # Truncate to safe length for DB / embeddings - add explicit marker
    if max_len and len(out) > max_len:
        out = out[: max_len - 14] + " ... [truncated]"

    return out

# --- CONFIG ---
TABLE_NAME = "documents"
VECTOR_DIM = 1536

# Batching / streaming settings to prevent timeouts
EMBEDDING_BATCH_SIZE = 16        # how many chunks to send in one embeddings request
DB_INSERT_BATCH_SIZE = 64        # how many rows to insert per DB batch
EMBEDDING_RETRY_BASE = 1.0       # backoff base seconds
EMBEDDING_MAX_RETRIES = 5
DB_RETRY_BASE = 0.5
DB_MAX_RETRIES = 4

load_dotenv()

# Use environment variables (safer than hardcoding)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
DB_URL = os.getenv("DB_URL")
BUCKET_NAME = "documents"

# clients
client = OpenAI(api_key=OPENAI_API_KEY)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def file_exists_in_bucket(file_name, bucket_name=BUCKET_NAME):
    try:
        items = supabase.storage.from_(bucket_name).list()
        if isinstance(items, dict) and items.get("data") is not None:
            for it in items["data"]:
                if it.get("name") == file_name:
                    return True
            return False
        for it in items:
            if isinstance(it, dict) and it.get("name") == file_name:
                return True
            if isinstance(it, str) and it == file_name:
                return True
        return False
    except Exception as e:
        print("Warning: could not list bucket items:", e)
        return False


def create_bucket_if_not_exists(bucket_name=BUCKET_NAME):
    try:
        try:
            info = supabase.storage.get_bucket(bucket_name)
            if info:
                print(f"Bucket '{bucket_name}' already exists or check succeeded.")
                return
        except Exception:
            pass

        resp = supabase.storage.create_bucket(bucket_name, options={"public": True})
        print(f"Bucket create response: {resp}")
        print(f"Bucket '{bucket_name}' created (or creation attempted).")
    except Exception as e:
        print(f"Warning: could not ensure bucket exists: {e}")


def ensure_table_exists():
    """Create documents table with embedding vector column and metadata, including chunk_text."""
    try:
        conn = psycopg2.connect(DB_URL)
        register_vector(conn)
        cur = conn.cursor()
        try:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        except Exception as e:
            print("Could not create extension (may already exist or not allowed):", e)

        cur.execute(
            sql.SQL(
                f"""
            CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
                id SERIAL PRIMARY KEY,
                filename TEXT,
                url TEXT,
                chunk_text TEXT,
                embedding VECTOR({VECTOR_DIM}),
                created_at TIMESTAMPTZ DEFAULT now()
            );
        """
            )
        )
        conn.commit()
        cur.close()
        conn.close()
        print(f"Table '{TABLE_NAME}' is ready (includes chunk_text).")
    except Exception as e:
        print(f"Error ensuring table exists: {e}")


# def upload_file_to_supabase(
#     file_path, bucket_name=BUCKET_NAME, overwrite=True, use_unique_name=False
# ):
#     original_name = os.path.basename(file_path)
#     file_name = original_name
#     if use_unique_name:
#         base, ext = os.path.splitext(original_name)
#         file_name = f"{base}_{uuid.uuid4().hex[:8]}{ext}"

#     with open(file_path, "rb") as f:
#         data = f.read()

#     for attempt in range(1, 6):
#         try:
#             if overwrite:
#                 try:
#                     resp = supabase.storage.from_(bucket_name).upload(
#                         file_name, data, {"upsert": True}
#                     )
#                     public_url = (
#                         f"{SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{file_name}"
#                     )
#                     return file_name, public_url
#                 except TypeError:
#                     pass
#                 except Exception as e:
#                     print("Upsert attempt failed:", e)

#             resp = supabase.storage.from_(bucket_name).upload(file_name, data)
#             public_url = (
#                 f"{SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{file_name}"
#             )
#             return file_name, public_url
#         except Exception as final_e:
#             print(f"Upload attempt {attempt} failed: {final_e}")
#             if attempt >= 5:
#                 raise RuntimeError(f"Failed upload after retries: {final_e}")
#             time.sleep(attempt * 0.8 + random.random() * 0.5)


def generate_embedding_batch(texts: List[str], model="text-embedding-3-small") -> List[List[float]]:
    attempt = 0
    while True:
        attempt += 1
        try:
            resp = client.embeddings.create(model=model, input=texts)
            embeddings = [r.embedding for r in resp.data]
            if len(embeddings) != len(texts):
                raise RuntimeError("Returned embeddings count mismatch")
            return embeddings
        except Exception as e:
            if attempt >= EMBEDDING_MAX_RETRIES:
                raise RuntimeError(f"Embedding generation failed after retries: {e}")
            backoff = EMBEDDING_RETRY_BASE * (2 ** (attempt - 1)) + random.random() * 0.5
            print(f"Embedding batch attempt {attempt} failed: {e}. Backing off {backoff:.1f}s")
            time.sleep(backoff)


# --- NEW: streaming chunk generator for DOCX and PDF only ---
def _words_from_text_stream(text: str):
    """Yield words from a block of text (generator)."""
    if not text:
        return
    # split on whitespace; keep punctuation as part of word (consistent with previous approach)
    for w in re.split(r"\s+", text.strip()):
        if w:
            yield w


def chunk_generator_from_file(
    file_path: str, chunk_size: int = 500, chunk_overlap: int = 50
) -> Generator[str, None, None]:
    """
    Stream a file (DOCX or PDF) and yield word-based chunks without loading entire large PDF into memory.
    chunk_size and chunk_overlap are in words.

    Only `.docx` and `.pdf` are supported; other extensions raise ValueError.
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"No such file: {file_path}")

    ext = os.path.splitext(file_path)[1].lower().lstrip(".")
    if ext not in ("pdf", "docx"):
        raise ValueError("Only .pdf and .docx files are supported by this function.")

    carry: List[str] = []

    def _maybe_yield_from_carry():
        """Yield chunk(s) while carry has >= chunk_size words."""
        nonlocal carry
        while len(carry) >= chunk_size:
            chunk_words = carry[:chunk_size]
            yield " ".join(chunk_words).strip()
            # keep overlap
            carry = carry[chunk_size - chunk_overlap :]

    # PDF streaming (page-by-page)
    if ext == "pdf":
        if fitz is None:
            raise RuntimeError("PyMuPDF (fitz) is required for PDF parsing. Install with `pip install PyMuPDF`.")
        doc = fitz.open(file_path)
        try:
            for page in doc:
                page_text = page.get_text("text") or ""
                # break page_text into lines then words to avoid huge single-line growth
                for line in page_text.splitlines():
                    for w in _words_from_text_stream(line):
                        carry.append(w)
                        if len(carry) >= chunk_size:
                            # yield as many chunks as possible
                            for out in _maybe_yield_from_carry():
                                yield out
            # flush remaining
            if carry:
                yield " ".join(carry).strip()
        finally:
            doc.close()

    # DOCX streaming (paragraphs + tables)
    else:  # docx
        if DocxDocument is None:
            raise RuntimeError("python-docx is required for DOCX parsing. Install with `pip install python-docx`.")
        doc = DocxDocument(file_path)
        # iterate paragraphs
        for para in doc.paragraphs:
            text = para.text or ""
            for line in text.splitlines():
                for w in _words_from_text_stream(line):
                    carry.append(w)
                    if len(carry) >= chunk_size:
                        for out in _maybe_yield_from_carry():
                            yield out
        # iterate tables (cells)
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    text = cell.text or ""
                    for line in text.splitlines():
                        for w in _words_from_text_stream(line):
                            carry.append(w)
                            if len(carry) >= chunk_size:
                                for out in _maybe_yield_from_carry():
                                    yield out
        # flush remaining
        if carry:
            yield " ".join(carry).strip()


def store_metadata_and_embedding_batch(
    rows: List[Tuple[str, str, str, Vector]],
    table_name: str = TABLE_NAME,
    db_url: str = DB_URL,
):
    """Insert many rows at once. rows = list of tuples (filename, url, chunk_text, Vector(embedding))."""
    if not rows:
        return []

    # Sanitize all string fields before trying to insert
    sanitized_rows = []
    for fn, url, chunk_txt, emb in rows:
        safe_fn = clean_text_for_db(fn) if isinstance(fn, str) else fn
        safe_url = clean_text_for_db(url) if isinstance(url, str) else url
        safe_chunk = clean_text_for_db(chunk_txt) if isinstance(chunk_txt, str) else chunk_txt
        sanitized_rows.append((safe_fn, safe_url, safe_chunk, emb))

    attempt = 0
    inserted_ids = []
    while True:
        attempt += 1
        conn = None
        try:
            conn = psycopg2.connect(db_url)
            register_vector(conn)
            cur = conn.cursor()
            # Use execute_values to insert many rows at once and RETURNING id
            # Note: extras.execute_values expects a query with %s placeholder for VALUES
            insert_query = sql.SQL(
                f"INSERT INTO {table_name} (filename, url, chunk_text, embedding) VALUES %s RETURNING id;"
            )
            extras.execute_values(
                cur,
                insert_query.as_string(conn),
                sanitized_rows,
                template="(%s, %s, %s, %s)",
                page_size=DB_INSERT_BATCH_SIZE,
            )
            ids = [r[0] for r in cur.fetchall()]
            conn.commit()
            cur.close()
            conn.close()
            inserted_ids.extend(ids)
            return inserted_ids
        except Exception as e:
            print(f"DB batch insert attempt {attempt} failed: {e}")
            try:
                if conn:
                    conn.rollback()
                    conn.close()
            except Exception:
                pass
            if attempt >= DB_MAX_RETRIES:
                raise RuntimeError(f"DB insert failed after retries: {e}")
            backoff = DB_RETRY_BASE * (2 ** (attempt - 1)) + random.random() * 0.3
            time.sleep(backoff)


def ingest_file(
    file_path,
    bucket_name=BUCKET_NAME,
    chunk_size=500,
    chunk_overlap=50,
    upload=True,
    overwrite=True,
    embedding_batch_size=EMBEDDING_BATCH_SIZE,
    db_insert_batch_size=DB_INSERT_BATCH_SIZE,
):
    """Stream the file into chunks, batch embeddings, and batch insert into DB.

    Only supports .docx and .pdf. Returns list of inserted ids.
    """
    # ensure infra
    create_bucket_if_not_exists(bucket_name)
    ensure_table_exists()

    ext = os.path.splitext(file_path)[1].lower().lstrip(".")
    if ext not in ("pdf", "docx"):
        raise ValueError("ingest_file only supports .pdf and .docx files")

    file_name = os.path.basename(file_path)
    file_url = None
    # if upload:
    #     file_name, file_url = upload_file_to_supabase(
    #         file_path, bucket_name=bucket_name, overwrite=overwrite
    #     )
    #     print(f"Uploaded file -> {file_url}")

    chunks_iter = chunk_generator_from_file(file_path, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    pending_chunk_labels: List[str] = []
    pending_chunks_metadata: List[Tuple[str, str]] = []
    all_inserted_ids = []
    total_chunks_processed = 0
    batch_count = 0

    def flush_embedding_and_insert(batch_chunk_labels: List[str], batch_metadata: List[Tuple[str, str]]):
        nonlocal all_inserted_ids, batch_count
        if not batch_chunk_labels:
            return
        batch_count += 1
        print(f"[batch {batch_count}] Requesting embeddings for {len(batch_chunk_labels)} chunks...")
        embeddings = generate_embedding_batch(batch_chunk_labels)
        # prepare rows for DB insertion
        rows = []
        for (chunk_label, _meta), emb in zip(batch_metadata, embeddings):
            rows.append((file_name, "None", chunk_label, Vector(emb)))
        for i in range(0, len(rows), db_insert_batch_size):
            sub = rows[i : i + db_insert_batch_size]
            inserted_ids = store_metadata_and_embedding_batch(sub, table_name=TABLE_NAME, db_url=DB_URL)
            all_inserted_ids.extend(inserted_ids)
        print(f"[batch {batch_count}] Inserted {len(rows)} rows (ids: {len(all_inserted_ids)} total).")

    for i, chunk in enumerate(chunks_iter):
        total_chunks_processed += 1
        raw_chunk_label = f"[chunk {total_chunks_processed}] " + chunk
        chunk_label = clean_text_for_db(raw_chunk_label)
        pending_chunk_labels.append(chunk_label)
        pending_chunks_metadata.append((chunk_label, ""))  # reserved for future metadata
        if len(pending_chunk_labels) >= embedding_batch_size:
            flush_embedding_and_insert(pending_chunk_labels, pending_chunks_metadata)
            pending_chunk_labels = []
            pending_chunks_metadata = []

    if pending_chunk_labels:
        flush_embedding_and_insert(pending_chunk_labels, pending_chunks_metadata)

    print(f"Completed processing. Total chunks processed: {total_chunks_processed}. Inserted rows: {len(all_inserted_ids)}")
    return all_inserted_ids


def generate_embedding_from_text(text):
    return generate_embedding_batch([text])[0]


def generate_embedding_from_file(file_path):
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    return generate_embedding_from_text(content)


def query_similar_embeddings(query_text, top_k=5):
    try:
        query_embedding = generate_embedding_from_text(query_text)

        conn = psycopg2.connect(DB_URL)
        try:
            register_vector(conn)
        except Exception:
            print("Warning: register_vector failed. Ensure pgvector is installed and connection is ok.")

        cur = conn.cursor()
        cur.execute(
            sql.SQL(
                """
                    SELECT id, filename, url, chunk_text, embedding, embedding <-> %s AS distance
                    FROM {table}
                    ORDER BY distance
                    LIMIT %s;
                """
            ).format(table=sql.Identifier(TABLE_NAME)),
            (Vector(query_embedding), top_k),
        )

        rows = cur.fetchall()
        cur.close()
        conn.close()

        results = []
        for r in rows:
            _id, filename, url, chunk_text_val, embedding_val, distance = r
            results.append(
                {
                    "id": _id,
                    "filename": filename,
                    "url": url,
                    "chunk_text": chunk_text_val,
                    "embedding": embedding_val,
                    "distance": float(distance) if distance is not None else None,
                }
            )
        return results

    except Exception as e:
        print(f"Error querying embeddings: {e}")
        return []


if __name__ == "__main__":
    # quick demo (uncomment to run)
    # inserted = ingest_file(
    #     "D:/clients/Canines/backend/training-doc/dc.txt",
    #     chunk_size=200,
    #     chunk_overlap=30,
    #     embedding_batch_size=EMBEDDING_BATCH_SIZE,
    #     db_insert_batch_size=DB_INSERT_BATCH_SIZE,
    # )
    # print("Inserted chunk ids:", inserted)
    print([l["chunk_text"] for l in query_similar_embeddings("amino qauantity.", top_k=6)])
