import os, requests
from dotenv import load_dotenv
import json
from typing import List, Dict, Optional
from openai import OpenAI
from supabase import create_client
import psycopg2
from psycopg2 import sql
from pgvector.psycopg2 import register_vector
from pgvector import Vector
import time
import random

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
from datetime import datetime

# Use environment variables (safer than hardcoding)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
DB_URL = os.getenv("DB_URL")
BUCKET_NAME = "documents"

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

# clients
client = OpenAI(api_key=OPENAI_API_KEY)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

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

def generate_embedding_from_text(text):
    return generate_embedding_batch([text])[0]

def query_similar_embeddings(query_text, top_k=6):
    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }

        messages = []

        # finally, append current user message
        messages.append({"role": "user", "content": f"Rewrite the following veterinary form into a concise natural language description that summarizes the dog's health condition and dietary context. Keep it factual, no extra advice: \n{query_text}"})

        payload = {"model": "gpt-4o", "messages": messages, "temperature": 1}

        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

        # safe extraction
        reply=query_text
        try:
            reply = data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            # fallback to a reasonable message
            print("Warning: couldn't parse a response. Using original query.",e)

        query_embedding = generate_embedding_from_text(reply)

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

def safe_json_loads(val: str):
    if not isinstance(val, str):
        return val
    cleaned = val.strip()
    # Remove markdown-style code fences if present
    if cleaned.startswith("```"):
        # drop leading and trailing fences
        cleaned = cleaned.strip("`")
        # sometimes starts with "json\n"
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].lstrip("\n\r ")
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].rstrip()
    try:
        return json.loads(cleaned)
    except Exception:
        return {"raw": val}  # fallback

def call_gpt_chat(
    user_message: str,
    subject: str,
    model: str = "gpt-4o",
    assistant_message: str = None,
    temperature: float = 0.7,
):
    docs=[l["chunk_text"] for l in query_similar_embeddings(user_message, top_k=6)]
    context="\n---\n".join(docs)
    if subject == "overview":
        system_message = (
            f"Context: {context}\n\n"+"""
You are an expert veterinarian. 
Based on the dog's description form and the context provided, provide accurate information to diagnose and guide the dog's health. Today's date is """
            + datetime.now().strftime("%Y-%m-%d")
            + """
Only return a JSON response in the following structure:
{
    "daily_meal_plan": [
        {"title": "Breakfast", "description": "..."},
        {"title": "Lunch", "description": "..."},
        {"title": "Dinner", "description": "..."}
    ],
    "what_to_do_goals": [
    // Generate a structured plan with DAILY goals for each day 
    // until the estimated_time period is over (e.g., 7 days, 14 days).
    // Each entry should include a "day" field to indicate which day it belongs to.
        {
            "title": "...",
            "description": "...",
            "priority": "...",
            "due_date": "...",
            "category": "stool_quality/energy_level/overall_health",
            "completed": false,
            "id": <add unique number here>,
            "achievement_badges": [
                {"title": "...", "description": "..."}
            ]
        }
    ],
    "estimated_time": <Time>,
    "next_revision": <Date>,
    "phase": {"title":<Any of reset, rebuild, strengthen>, "description": <A small phrase explaining the phase>}
}
Do not include any explanations outside this JSON and nothing before first '{'.
"""
        )
    elif subject == "protocol":
        system_message = (
            f"Context: {context}\n\n"+"""
You are an expert veterinarian. 
Based on the dog's description form and the context provided, provide accurate information to diagnose and guide the dog's health. Today's date is """
            + datetime.now().strftime("%Y-%m-%d")
            + """
Only return a JSON response in the following structure:
{
    "supplements": [
        {
            "title": "..."
        }, ...
    ],
    "lifestyle_recommendations":[
        {
            "title": "...",
            "id": <add unique number here>
        }, ...
    ],
    "next_steps": [
        {"id": <add unique number here>, "title":"..."}
    ],
    "confidence": <0 - 100>,
    "priority": "<low, medium, high, urgent>",
    "symptoms": [<list of symptoms>]
}
Do not include any explanations outside this JSON and nothing before first '{'.
"""
        )

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    # Build message list
    messages = [
        {"role": "system", "content": system_message},
        {
            "role": "user",
            "content": f"""My dog's description form is: \n{user_message}""",
        },
    ]

    if assistant_message:
        messages.insert(2, {"role": "assistant", "content": assistant_message})

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }

    print("Calling OpenAI with payload:", user_message)  # Debug log

    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()

    # Assuming at least one choice is returned
    res = {}
    try:
        res = safe_json_loads(data["choices"][0]["message"]["content"])
    except Exception as e:
        print("AI generation error occured: ",e)

    return res

def ask_question(
    user_message: str,
    history: Optional[List[Dict[str, str]]] = None,
    model: str = "gpt-4o",
    temperature: float = 0.7,
) -> str:
    """
    Let users chat freely with the AI vet assistant.
    history: optional list of {"role": "user"|"assistant", "content": "..."}
    Returns the assistant reply string.
    """
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    system_message = (
        "You are an expert veterinarian assistant.\n"
        "Answer user questions about their dog clearly, concisely, and in plain text.\n"
        "Do not output JSON, only human-readable text."
    )

    messages = [{"role": "system", "content": system_message}]

    # append history if provided (trusted roles only)
    if history:
        for h in history:
            role = h.get("role")
            content = h.get("content")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

    # finally, append current user message
    messages.append({"role": "user", "content": user_message})

    payload = {"model": model, "messages": messages, "temperature": temperature}

    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()

    # safe extraction
    try:
        reply = data["choices"][0]["message"]["content"].strip()
    except Exception:
        # fallback to a reasonable message
        reply = "Sorry — I couldn't parse a response. Please try again."
    return reply

def get_current_health_status_summary(
    user_message: str,
    model: str = "gpt-4o",
    temperature: float = 0.7,
) -> str:
    """
    Let users chat freely with the AI vet assistant.
    history: optional list of {"role": "user"|"assistant", "content": "..."}
    Returns the assistant reply string.
    """
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    system_message = (
        "You are an expert veterinarian assistant.\n"
        "You are given a dog's current health status form data. Assume you already know which dog this is, so do not restate the dog's name or breed. Ignore empty or missing fields. Summarize only the provided information into a clear, concise current health status update.\n"
        "Do not output JSON, only human-readable text."
    )

    messages = [{"role": "system", "content": system_message}]

    # finally, append current user message
    messages.append({"role": "user", "content": "The form data: "+user_message})

    payload = {"model": model, "messages": messages, "temperature": temperature}

    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()

    # safe extraction
    try:
        reply = data["choices"][0]["message"]["content"].strip()
    except Exception:
        # fallback to a reasonable message
        reply = "Sorry — I couldn't parse a response. Please try again."
    return reply


def analyze_health_logs(
    health_logs: str,
    model: str = "gpt-4o",
    temperature: float = 0.5,
) -> Dict:
    """
    Analyze dog's health logs and return a JSON with a health score (0-100)
    and additional insights.
    """

    system_message = """
You are an expert veterinarian. 
You will analyze the dog's health logs.
Return only a JSON object with the following structure:
{
    "health_score": <0-100>,
    "key_observations": ["...", "..."],
    "recommendations": ["...", "..."],
    "confidence": <0-100>,
    "stool_quality":"<critical/improving/stable>",
    "energy_level": "<low/moderate/high>",
    "overall_health": "<critical/improving/stable>",
    "summary": "<A concise summary of the dog's health status>"
}
Do not include any explanations outside this JSON and nothing before first '{'.
"""

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"Here are the dog's health logs:\n{health_logs}"},
    ]

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }

    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()

    try:
        result = safe_json_loads(data["choices"][0]["message"]["content"])
    except Exception as e:
        print("Error parsing JSON:", e)
        result = {
            "health_score": 0,
            "key_observations": [],
            "recommendations": [],
            "confidence": 0
        }

    return result

def daily_tip(
    model: str = "gpt-4o",
    temperature: float = 1,
) -> str:
    """
    Let users chat freely with the AI vet assistant.
    history: optional list of {"role": "user"|"assistant", "content": "..."}
    Returns the assistant reply string.
    """
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    system_message = (
        "You are an expert veterinarian assistant.\n"
        "Create a daily tip for dog owners for keeping their pets' gut and health healthy and happy.\n"
        "Do not output JSON, only human-readable text."
    )

    messages = [{"role": "system", "content": system_message}]
    user_message = "Provide a concise, friendly, and practical tip for dog owners."

    # finally, append current user message
    messages.append({"role": "user", "content": user_message})

    payload = {"model": model, "messages": messages, "temperature": temperature}

    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()

    # safe extraction
    try:
        reply = data["choices"][0]["message"]["content"].strip()
    except Exception:
        # fallback to a reasonable message
        reply = "Sorry — I couldn't parse a response. Please try again."
    return reply


# Example usage
if __name__ == "__main__":
    system = """
You are an expert veterinarian. 
Based on the dog's description form provided, medical standards, and scientific knowledge, provide accurate information to diagnose and guide the dog's health. Today's date is """ + datetime.now().strftime("%Y-%m-%d") + """.
Only return a JSON response in the following structure:

{
    "daily_meal_plan": [
        {"title": "Breakfast", "description": "..."},
        {"title": "Lunch", "description": "..."},
        {"title": "Dinner", "description": "..."}
    ],
    "what_to_do_goals": [
        {
            "title": "...",
            "description": "...",
            "priority": "...",
            "due_date": "...",
            "completed": false,
            "id": <add unique number here>,
            "achievement_badges": [
                {"title": "...", "description": "..."}
            ]
        }
    ]
}

Do not include any explanations outside this JSON and nothing before first '{'.
"""

    user = """
    Field: Dog's Name
User value: haskldfhklj
---
Field: Breed
User value: hklhaskldhf
---
Field: Age (years)
User value: 2
---
Field: Weight (kg)
User value: 22
---
Field: Stool Type
User value: normal
---
Field: Symptoms
User value: ['diarrhea']
---
Field: Behavior Notes
User value: bkhkhkj
---
Field: Color
User value: black
Description: Color of the dog.
---"""
    try:
        reply = call_gpt_chat(user, "protocol")
    except Exception as e:
        print("Error:", e)
