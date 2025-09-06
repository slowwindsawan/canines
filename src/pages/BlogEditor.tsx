import React, { useEffect, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Save, FileText, ArrowLeftIcon } from "lucide-react";
import { jwtRequest } from "../env";

interface BlogPost {
  id?: string;
  slug: string;
  title: string;
  content: string;
  summary?: string | null;
  cover_image?: string | null;
  tags?: string[] | null;
  published_at?: string | null;
  author_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface Props {
  setShowCreatePost: React.Dispatch<React.SetStateAction<boolean>>;
  setPosts: React.Dispatch<React.SetStateAction<BlogPost[]>>;
  selectedPost?: Partial<BlogPost> | null;
}

/** Helper: slugify title */
const slugify = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const BlogEditor: React.FC<Props> = ({ setShowCreatePost, setPosts, selectedPost = null }) => {
  const [title, setTitle] = useState<string>(selectedPost?.title ?? "");
  const [content, setContent] = useState<string>(selectedPost?.content ?? "");
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // when selectedPost changes (e.g., edit selected), populate fields
  useEffect(() => {
    setTitle(selectedPost?.title ?? "");
    setContent(selectedPost?.content ?? "");
  }, [selectedPost]);

  // helper to persist posts array to localStorage
  const persistPosts = (nextPosts: BlogPost[]) => {
    try {
      localStorage.setItem("blogPosts", JSON.stringify(nextPosts));
    } catch (e) {
      // ignore
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please provide a title.");
      return;
    }

    setSaving(true);

    // Build payloads
    const createPayload = {
      slug: slugify(title),
      title: title.trim(),
      content,
      summary: content.replace(/<[^>]*>/g, "").slice(0, 300) || undefined,
      cover_image: null,
      tags: [] as string[],
      published_at: new Date().toISOString(),
    };

    // For updates only send fields allowed in ArticleUpdate
    const updatePayload: Partial<typeof createPayload> = {
      title: title.trim(),
      content,
      summary: content.replace(/<[^>]*>/g, "").slice(0, 300) || undefined,
      // cover_image, tags, published_at can also be passed when available
    };

    try {
      if (selectedPost && selectedPost.id) {
        // UPDATE flow
        const id = selectedPost.id;
        const updated = await jwtRequest(`/articles/update/${id}`, "POST", updatePayload);

        if (updated && updated.id) {
          // replace existing post in state
          setPosts((prev) => {
            const next = prev.map((p) => (p.id === updated.id ? (updated as BlogPost) : p));
            persistPosts(next);
            return next;
          });
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 2000);
          setShowCreatePost(false);
        } else {
          throw new Error("Update endpoint did not return updated article.");
        }
      } else {
        // CREATE flow
        const created = await jwtRequest("/articles/create", "POST", createPayload);

        if (created && created.id) {
          setPosts((prev) => {
            const next = [created as BlogPost, ...prev];
            persistPosts(next);
            return next;
          });
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 2000);
          setShowCreatePost(false);
        } else {
          // fallback: optimistic insert
          const fallback = { ...createPayload, id: `local-${Date.now()}` } as BlogPost;
          setPosts((prev) => {
            const next = [fallback, ...prev];
            persistPosts(next);
            return next;
          });
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 2000);
          setShowCreatePost(false);
        }
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save article. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  const modules = {
    toolbar: [
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link"],
      ["clean"],
    ],
  };

  const formats = ["bold", "italic", "underline", "list", "bullet", "link"];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div
              className="cursor-pointer flex items-center rounded-3xl hover:bg-brand-offwhite p-2 hover:shadow-md"
              onClick={() => setShowCreatePost(false)}
            >
              <ArrowLeftIcon className="mr-2" size={20} />
              Back
            </div>
            <FileText className="w-8 h-8 text-brand-charcoal" />
            <h1 className="text-3xl font-bold text-gray-900">
              {selectedPost && selectedPost.id ? "Edit Article" : "Create Article"}
            </h1>
          </div>
          <p className="text-gray-600">
            {selectedPost && selectedPost.id ? "Update your article" : "Create beautiful educational content with ease"}
          </p>
        </div>

        {/* Editor Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Title Input */}
          <div className="border-b border-gray-200 p-6">
            <input
              type="text"
              placeholder="Enter your blog title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-2xl font-semibold text-gray-900 placeholder-gray-400 border-none outline-none bg-transparent"
            />
          </div>

          {/* Rich Text Editor */}
          <div className="relative">
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={modules}
              formats={formats}
              placeholder="Start writing your blog post..."
              className="border-none"
              style={{ height: "400px" }}
            />
          </div>

          {/* Save Button */}
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {(content || "").replace(/<[^>]*>/g, "").length} characters
              </div>
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isSaved
                    ? "bg-brand-offwhite text-brand-midgrey border border-brand-midgrey"
                    : "bg-brand-midgrey text-white hover:bg-brand-charcoal shadow-sm hover:shadow-md"
                }`}
                type="button"
                disabled={saving}
              >
                <Save size={16} />
                {saving ? "Saving..." : isSaved ? "Saved!" : selectedPost && selectedPost.id ? "Save Changes" : "Save Post"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Your content is automatically saved to localStorage
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;
