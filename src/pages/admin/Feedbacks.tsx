import React, { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Eye,
  User as UserIcon,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Mail,
  Clipboard,
} from "lucide-react";
import { jwtRequest } from "../../env";
import AdminTotalsStrip from "./TotalStrip";

const truncate = (s, n = 120) =>
  !s ? "—" : s.length > n ? `${s.slice(0, n)}…` : s;

export default function FeedbacksPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // list state
  const [feedbacks, setFeedbacks] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);

  // search / query
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // modal
  const [openFeedbackId, setOpenFeedbackId] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalError, setModalError] = useState(null);

  // read filters from URL if you want (example for date or other filters later)
  // const dateFilter = searchParams.get("date") || null;

  // fetch page function
  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("per_page", String(pageSize));
        if (searchQuery) qs.set("q", searchQuery);

        const endpoint = `/admin/feedback?${qs.toString()}`;
        const res = await jwtRequest(endpoint, "GET");

        // Backend shapes vary; accept common shapes
        // Prefer res.feedbacks + res.pagination, fallback to res.items or res.data
        const items = res.feedbacks ?? res.items ?? res.data ?? [];
        setFeedbacks(items);

        // pagination info
        const pagination = res.pagination ?? res.meta ?? {};
        setPage(pagination.page ?? page);
        setPageSize(pagination.per_page ?? pageSize);
        setTotal(
          pagination.total ?? res.totals?.total_feedbacks ?? items.length
        );
        setTotalPages(
          pagination.total_pages ??
            Math.max(
              1,
              Math.ceil((pagination.total ?? items.length) / pageSize)
            )
        );

        setTotals(res.totals ?? null);
      } catch (err) {
        console.error("Failed to fetch feedbacks:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, searchQuery]);

  // search handlers
  const handleSearch = () => {
    setPage(1);
    setSearchQuery(searchTerm.trim());
  };
  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchQuery("");
    setPage(1);
  };
  const onInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  // modal open -> fetch detail (if endpoint exists)
  const openModal = useCallback(async (id, fallback = null) => {
    setOpenFeedbackId(id);
    setModalLoading(true);
    setModalError(null);
    setModalData(null);

    try {
      // Try the admin detail endpoint first
      const res = await jwtRequest(`/admin/feedbacks/${id}`, "GET");
      // server might return { feedback: {...} } or the object directly
      const data = res.feedback ?? res;
      setModalData(data ?? fallback);
    } catch (err) {
      // fallback to passed-in item
      console.warn("Falling back to provided item for modal:", err);
      setModalError(null);
      setModalData(fallback);
    } finally {
      setModalLoading(false);
    }
  }, []);

  const closeModal = () => {
    setOpenFeedbackId(null);
    setModalData(null);
    setModalError(null);
  };

  const goToPage = (p) => {
    if (p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    setPage(p);
  };

  const handlePageSizeChange = (e) => {
    const ps = Number(e.target.value) || 10;
    setPageSize(ps);
    setPage(1);
  };

  const fmtDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      // small visual feedback could be added
    } catch (e) {
      console.warn("Clipboard copy failed", e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Feedback</h1>
            <p className="text-lg text-gray-600">
              User feedback & messages submitted from the app
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Showing {feedbacks.length} of {total ?? "—"} feedbacks
              </h3>
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <label className="text-sm text-gray-600">Page size</label>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="px-2 py-1 border rounded"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feedbacks.map((fb, i) => (
                  <tr key={fb.id || i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-500">
                        {(page - 1) * pageSize + i + 1}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {fb.name ?? "Anonymous"}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {fb.email ?? "—"}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="mb-4 text-sm text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px]">
                        {truncate(fb.message, 140)}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {fmtDate(fb.created_at)}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex flex-col items-end space-y-1">
                      <div className="flex flex-col items-end space-y-1">
                        <button
                          onClick={() => openModal(fb.id, fb)}
                          className="inline-flex items-center text-emerald-600 hover:text-emerald-900 transition-colors"
                        >
                          <Eye size={14} className="mr-2" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {feedbacks.length === 0 && !loading && (
            <div className="text-center py-12">
              <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No feedback found
              </h3>
              <p className="text-gray-600">
                Try adjusting your search or page size.
              </p>
            </div>
          )}

          {/* Pagination controls */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }).map(
                  (_, idx) => {
                    const half = Math.floor(5 / 2);
                    let start = Math.max(
                      1,
                      Math.min(page - half, Math.max(1, totalPages - 4))
                    );
                    const pnum = start + idx;
                    if (pnum > totalPages) return null;
                    return (
                      <button
                        key={pnum}
                        onClick={() => goToPage(pnum)}
                        className={`px-3 py-1 border rounded ${
                          pnum === page ? "bg-emerald-600 text-white" : ""
                        }`}
                      >
                        {pnum}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>

            <div className="text-sm text-gray-600">
              {loading
                ? "Loading..."
                : `Showing ${(page - 1) * pageSize + 1}-${Math.min(
                    page * pageSize,
                    total
                  )} of ${total}`}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {openFeedbackId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="absolute inset-0 bg-black/40" />

          <div className="relative z-10 max-w-3xl w-full bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <UserIcon className="h-6 w-6 text-gray-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Feedback from {modalData?.name ?? "Anonymous"}
                  </h3>
                  <div className="text-sm text-gray-500">
                    {modalData?.email ?? "—"}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={closeModal}
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="px-6 py-6 max-h-[80vh] overflow-y-auto">
              {modalLoading ? (
                <div className="text-center py-12">Loading...</div>
              ) : modalError ? (
                <div className="text-center py-12 text-red-600">
                  Failed to load feedback
                </div>
              ) : (
                <>
                  <div className="mb-4 text-sm text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px]">
                    <b>Message:&nbsp;</b>{modalData?.message}
                  </div>

                  <div className="text-sm text-gray-500 mb-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4" />
                      <div>{fmtDate(modalData?.created_at)}</div>
                    </div>
                    {modalData?.meta && !modalData?.meta?.url && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500">Meta</div>
                        <pre className="text-xs bg-gray-50 p-2 rounded">
                          {JSON.stringify(modalData.meta, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
