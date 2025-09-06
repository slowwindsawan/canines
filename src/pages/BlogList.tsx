import React, { useState, useEffect, useRef } from "react";
import { FileText, Edit, Trash2, Plus, Calendar, User, ChevronsLeft, ChevronsRight } from "lucide-react";
import { jwtRequest } from "../env";
import BlogEditor from "./BlogEditor";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
  // backend fields compatibility
  created_at?: string;
  updated_at?: string;
}

const TRASH_TIMEOUT_MS = 5000; // 5 seconds to undo

const DEFAULT_PAGE_SIZE = 6;

const BlogList: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<Partial<BlogPost> | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);

  // pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // pendingDeletes holds { [id]: { item: BlogPost, timeoutId: number } }
  const pendingDeletes = useRef<Record<string, { item: BlogPost; timeoutId: number }>>({});

  const [recentlyDeleted, setRecentlyDeleted] = useState<BlogPost | null>(null);

  // load from backend on mount (your POST /articles/ pattern)
  useEffect(() => {
    (async () => {
      try {
        const response = await jwtRequest("/articles/", "POST", {});
        if (Array.isArray(response)) {
          setPosts(response);
          localStorage.setItem("blogPosts", JSON.stringify(response));
        } else if (response) {
          setPosts([response]);
          localStorage.setItem("blogPosts", JSON.stringify([response]));
        } else {
          setPosts([]);
        }
      } catch (e) {
        console.error("Failed to fetch articles:", e);
        // fallback to local storage if network fails
        loadPostsFromLocal();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helper to load from localStorage (fallback)
  const loadPostsFromLocal = () => {
    const savedPosts = localStorage.getItem("blogPosts");
    if (savedPosts) {
      try {
        setPosts(JSON.parse(savedPosts));
      } catch {
        setPosts([]);
      }
    }
  };

  // Persist posts when they change
  useEffect(() => {
    localStorage.setItem("blogPosts", JSON.stringify(posts));
  }, [posts]);

  // Reset page when posts or pageSize change to keep page in range
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(posts.length / pageSize));
    if (page > totalPages) setPage(totalPages);
    if (posts.length === 0) setPage(1);
  }, [posts, pageSize, page]);

  const onEditPost = (id: string) => {
    const found = posts.find((x) => x.id === id);
    setSelectedPost(found ?? null);
    setShowCreatePost(true);
  };

  const onNewPost = () => {
    setSelectedPost(null);
    setShowCreatePost(true);
  };

  // Immediately hide the post and schedule backend delete after TRASH_TIMEOUT_MS.
  // User can undo before the timeout fires.
  const trashPost = (post: BlogPost) => {
    // if already pending, ignore
    if (pendingDeletes.current[post.id]) return;

    // Optimistic remove from UI
    setPosts((prev) => prev.filter((p) => p.id !== post.id));

    // remember recently deleted for UI & undo
    setRecentlyDeleted(post);

    // schedule backend delete after timeout
    const timeoutId = window.setTimeout(async () => {
      try {
        // call backend delete endpoint
        await jwtRequest(`/articles/delete/${post.id}`, "POST", {});
        // successful delete -> remove pending record
        delete pendingDeletes.current[post.id];
        setRecentlyDeleted(null);
      } catch (err) {
        console.error("Failed to delete article on server, restoring locally:", err);
        // restore locally if backend delete failed
        setPosts((prev) => [post, ...prev]);
        delete pendingDeletes.current[post.id];
        setRecentlyDeleted(null);
      }
    }, TRASH_TIMEOUT_MS);

    // store pending delete
    pendingDeletes.current[post.id] = { item: post, timeoutId };
  };

  // Cancel pending delete and restore immediately
  const undoTrash = (postId: string) => {
    const pending = pendingDeletes.current[postId];
    if (!pending) return;

    // clear the scheduled delete
    clearTimeout(pending.timeoutId);

    // restore the item to posts (prepend)
    setPosts((prev) => [pending.item, ...prev]);

    // remove from pending and clear recentlyDeleted if matches
    delete pendingDeletes.current[postId];
    setRecentlyDeleted(null);
  };

  // Hard delete immediately without undo window (if needed)
  const deleteImmediately = async (post: BlogPost) => {
    // remove from UI
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    try {
      await jwtRequest(`/articles/delete/${post.id}`, "POST", {});
    } catch (err) {
      console.error("Immediate delete failed:", err);
      // restore if backend fails
      setPosts((prev) => [post, ...prev]);
    }
  };

  // convenience wrapper used by UI delete button:
  const handleDeleteClick = (post: BlogPost) => {
    // If you prefer immediate delete without undo, call deleteImmediately(post)
    // For safer UX, we use trashPost with undo window.
    trashPost(post);
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + "...";
  };

  const formatDate = (value?: string | number | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-GB", { month: "short" });
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;
    return `${day} ${month}, ${year} ${hours}:${minutes} ${ampm}`;
  };

  // --- PAGINATION LOGIC ---
  const totalItems = posts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPosts = posts.slice(startIndex, endIndex);

  const goToPage = (p: number) => {
    if (p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    setPage(p);
    // scroll to top of list on page change for better UX
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderPageButtons = () => {
    const buttons = [];
    // show up to 7 page buttons centered around current page
    const maxButtons = 7;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxButtons + 1);
    }
    for (let i = start; i <= end; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`px-3 py-1 rounded-md text-sm border ${
            i === page ? "bg-brand-charcoal text-white" : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  return (
    <>
      {showCreatePost ? (
        <BlogEditor
          setShowCreatePost={setShowCreatePost}
          setPosts={(updater) =>
            setPosts((prev) => (typeof updater === "function" ? (updater as any)(prev) : updater))
          }
          posts={posts}
          // optional: pass selectedPost prop if your BlogEditor supports editing
          selectedPost={selectedPost}
        />
      ) : (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-6xl mx-auto px-4">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-brand-charcoal" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Blog Posts</h1>
                    <p className="text-gray-600 mt-1">Manage and organize your content</p>
                  </div>
                </div>
                <button
                  onClick={onNewPost}
                  className="flex items-center gap-2 px-6 py-3 bg-brand-charcoal text-white rounded-lg font-medium hover:bg-brand-midgrey transition-colors shadow-sm hover:shadow-md"
                >
                  <Plus size={20} />
                  New Post
                </button>
              </div>
            </div>

            {/* Posts Grid */}
            {totalItems === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No blog posts yet</h3>
                <p className="text-gray-500 mb-6">Create your first blog post to get started</p>
                <button
                  onClick={onNewPost}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-charcoal text-white rounded-lg font-medium hover:bg-brand-midgrey transition-colors"
                >
                  <Plus size={20} />
                  Create First Post
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedPosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="p-6">
                        {/* Post Title */}
                        <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                          {post.title || "Untitled Post"}
                        </h3>

                        {/* Post Preview */}
                        <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                          {truncateText(stripHtml(post.content || ""), 120)}
                        </p>

                        {/* Post Meta */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(post.createdAt ?? post.created_at)}
                          </div>
                          <div className="flex items-center gap-1">
                            <User size={12} />
                            {stripHtml(post.content || "").length} chars
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEditPost(post.id)}
                            className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                          >
                            <Edit size={14} />
                            Edit
                          </button>

                          <button
                            onClick={() => handleDeleteClick(post)}
                            className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                <div className="mt-8 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-600">
                      <FileText size={16} />
                      Showing {startIndex + 1} - {Math.min(endIndex, totalItems)} of {totalItems}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => goToPage(page - 1)}
                        disabled={page === 1}
                        className="px-3 py-1 rounded-md border bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronsLeft size={16} />
                      </button>

                      {renderPageButtons()}

                      <button
                        onClick={() => goToPage(page + 1)}
                        disabled={page === totalPages}
                        className="px-3 py-1 rounded-md border bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronsRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Per page</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1); // reset to first page when page size changes
                      }}
                      className="px-3 py-1 border rounded-md text-sm"
                    >
                      <option value={6}>6</option>
                      <option value={9}>9</option>
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Stats */}
            {totalItems > 0 && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-600">
                  <FileText size={16} />
                  {totalItems} {totalItems === 1 ? "post" : "posts"} total
                </div>
              </div>
            )}

            {/* Undo Banner */}
            {recentlyDeleted && (
              <div className="fixed left-4 bottom-6 z-50">
                <div className="flex items-center gap-4 bg-white border border-gray-200 shadow-md rounded-lg px-4 py-3">
                  <div className="text-sm text-gray-800">
                    Deleted: <strong>{recentlyDeleted.title || "Untitled"}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => undoTrash(recentlyDeleted.id)}
                      className="px-3 py-1 rounded-md bg-green-600 text-white text-sm"
                    >
                      Undo
                    </button>
                    <button
                      onClick={() => {
                        // If user clicks "Dismiss", we simply clear the banner.
                        // The scheduled delete will still run (or has run).
                        setRecentlyDeleted(null);
                      }}
                      className="px-3 py-1 rounded-md bg-gray-100 text-sm"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default BlogList;
