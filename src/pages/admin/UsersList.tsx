import React, { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  User as UserIcon,
  Calendar,
  Eye,
  Pencil,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Mail,
  Users,
  Hash,
  Dog,
} from "lucide-react";
import { jwtRequest } from "../../env";
import AdminTotalsStrip from "./TotalStrip";

/**
 * UsersList with modals for "View" (user profile) and "Dogs" (dog list).
 * - Fetches list from /admin/users (existing behavior).
 * - When opening a modal, tries to fetch /admin/users/:id and /admin/users/:id/dogs (if available).
 * - If those endpoints don't exist on your backend, the component falls back to user object fields.
 *
 * Note: adjust endpoints if your backend exposes different paths for user/dog details.
 */

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();

  // input vs actual query sent to backend
  const [searchTerm, setSearchTerm] = useState(""); // user typing
  const [searchQuery, setSearchQuery] = useState(""); // set when Search clicked (or Enter)

  const [loading, setLoading] = useState(false);

  // pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters via URLSearchParams
  const statusFilter = searchParams.get("status") || "all"; // subscription_status
  const planFilter = searchParams.get("plan") || "all"; // subscription_tier

  // Modal state
  const [openUserId, setOpenUserId] = useState(null); // user id for profile modal
  const [openDogsUserId, setOpenDogsUserId] = useState(null); // user id for dogs modal

  // Detailed modal content states
  const [modalUserLoading, setModalUserLoading] = useState(false);
  const [modalUserError, setModalUserError] = useState(null);
  const [modalUserData, setModalUserData] = useState(null);

  const [modalDogsLoading, setModalDogsLoading] = useState(false);
  const [modalDogsError, setModalDogsError] = useState(null);
  const [modalDogsData, setModalDogsData] = useState(null);
  const [totals, setTotals] = useState(null);

  // Fetch page whenever filters / page / pageSize / searchQuery change
  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("per_page", String(pageSize)); // backend expects per_page
        if (searchQuery) qs.set("q", searchQuery);
        if (statusFilter && statusFilter !== "all") qs.set("status", statusFilter);
        if (planFilter && planFilter !== "all") qs.set("plan", planFilter);

        const endpoint = `/admin/users?${qs.toString()}`;
        const data = await jwtRequest(endpoint, "GET");
        setTotals(data?.totals || null);

        // backend shape: { users: [...], pagination: { page, per_page, total_pages, filtered_users }, totals: {...} }
        setUsers(data.users || []);
        const filtered = data.pagination?.filtered_users ?? data.totals?.filtered_users ?? null;
        const overall = data.totals?.total_users ?? null;
        setTotal(filtered ?? overall ?? (data.users ? data.users.length : 0));
        setTotalPages(data.pagination?.total_pages ?? 1);
        setPage(data.pagination?.page ?? page);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, statusFilter, planFilter, searchQuery]);

  // UI handlers
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

  // Called when user clicks Search or presses Enter
  const handleSearch = () => {
    setPage(1);
    setSearchQuery(searchTerm.trim());
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchQuery("");
    setPage(1);
  };

  // Enter key triggers search
  const onInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  // Simple mapping for subscription status icons (small visual helpers)
  const getStatusIcon = (status) => {
    switch ((status || "").toLowerCase()) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "past_due":
      case "unpaid":
      case "canceled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "trialing":
      case "incomplete":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // ---------- Modal helpers ----------
  // Close modals on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpenUserId(null);
        setOpenDogsUserId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openUserModal = useCallback(async (userId, fallbackUser) => {
    setOpenUserId(userId);
    setModalUserLoading(true);
    setModalUserError(null);
    setModalUserData(null);

    // Try fetching detailed user endpoint; fall back to list user object if fetch fails
    try {
      const data = await jwtRequest(`/admin/users/${userId}`, "GET");
      console.warn("Fetched detailed user data:", data);
      // prefer server-provided detailed object if available
      setModalUserData(data.user ?? data);
    } catch (err) {
      console.warn("Failed to fetch detailed user - falling back to provided user data", err);
      setModalUserError(null);
      setModalUserData(fallbackUser || null);
    } finally {
      setModalUserLoading(false);
    }
  }, []);

  const openDogsModal = useCallback(async (userId, fallbackDogs) => {
    setOpenDogsUserId(userId);
    setModalDogsLoading(true);
    setModalDogsError(null);
    setModalDogsData(null);

    // Try fetching user's dogs endpoint; fall back to the user.dogs field or empty array
    try {
      const data = await jwtRequest(`/admin/users/${userId}/dogs`, "GET");
      // expect { dogs: [...] } or array
      setModalDogsData(data.dogs ?? data);
    } catch (err) {
      console.warn("Failed to fetch user dogs - falling back to provided dogs list", err);
      setModalDogsError(null);
      setModalDogsData(fallbackDogs ?? []);
    } finally {
      setModalDogsLoading(false);
    }
  }, []);

  // Close helpers
  const closeUserModal = () => {
    setOpenUserId(null);
    setModalUserData(null);
    setModalUserError(null);
  };
  const closeDogsModal = () => {
    setOpenDogsUserId(null);
    setModalDogsData(null);
    setModalDogsError(null);
  };

  // Helper to format date
  const fmtDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Users</h1>
            <p className="text-lg text-gray-600">Manage your app users and subscriptions</p>
          </div>
        </div>
        
        <AdminTotalsStrip totals={totals} />

        {/* Filters + Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative flex items-center">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by username, name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  className="w-full pl-10 pr-32 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />

                {/* Search & Clear buttons */}
                <div className="absolute right-2 flex space-x-2">
                  <button
                    onClick={handleClearSearch}
                    disabled={loading && !searchQuery}
                    className="px-3 py-1 rounded border bg-white text-sm text-gray-700 hover:bg-gray-50"
                    title="Clear"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="px-3 py-1 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex space-x-4">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setSearchParams({
                    ...Object.fromEntries(searchParams),
                    status: e.target.value,
                  })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">All Subscription Status</option>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past Due</option>
                <option value="canceled">Canceled</option>
                <option value="incomplete">Incomplete</option>
                <option value="unpaid">Unpaid</option>
              </select>

              <select
                value={planFilter}
                onChange={(e) =>
                  setSearchParams({
                    ...Object.fromEntries(searchParams),
                    plan: e.target.value,
                  })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">All Plans</option>
                <option value="foundation">Foundation</option>
                <option value="therapeutic">Therapeutic</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Showing {users.length} of {total} users
              </h3>
              <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
            </div>

            <div className="flex items-center space-x-3">
              <label className="text-sm text-gray-600">Page size</label>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="px-2 py-1 border rounded"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email / Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dogs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user, index) => (
                  <tr key={user.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-500">{(page - 1) * pageSize + index + 1}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-8 w-8 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.username || user.name || "—"}</div>
                          <div className="text-sm text-gray-500">{user.name || "—"}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email || "—"}</div>
                      <div className="text-xs text-gray-500">{user.role || "user"}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.dogs_count ?? user.dogsCount ?? (user.dogs ? user.dogs.length : 0)}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(user.subscription_status)}
                        <div className="flex flex-col">
                          <div className="text-sm text-gray-900">{(user.subscription_tier || "—").replace("_", " ")}</div>
                          <div className="text-xs text-gray-500">{user.subscription_status || "—"}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-y-1 flex flex-col items-end">
                      {/* View button opens user modal */}
                      <button
                        onClick={() => openUserModal(user.id, user)}
                        className="inline-flex items-center text-emerald-600 hover:text-emerald-900 transition-colors"
                      >
                        <Eye size={14} className="mr-2" />
                        View
                      </button>

                      {/* Dogs button opens dogs modal; fall back to user.dogs if present */}
                      <button
                        onClick={() => openDogsModal(user.id, user.dogs)}
                        className="inline-flex items-center text-blue-600 hover:text-blue-900 transition-colors mt-2"
                      >
                        <Dog size={14} className="mr-2" />
                        Dogs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
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
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  const half = Math.floor(5 / 2);
                  let start = Math.max(1, Math.min(page - half, totalPages - 4));
                  const pnum = start + i;
                  if (pnum > totalPages) return null;
                  return (
                    <button
                      key={pnum}
                      onClick={() => goToPage(pnum)}
                      className={`px-3 py-1 border rounded ${pnum === page ? "bg-emerald-600 text-white" : ""}`}
                    >
                      {pnum}
                    </button>
                  );
                })}
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
              {loading ? "Loading..." : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- User Modal ---------------- */}
      {openUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeUserModal}
          />

          <div className="relative max-w-3xl w-full mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <UserIcon className="h-8 w-8 text-gray-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {modalUserData?.username || modalUserData?.name || "User profile"}
                  </h3>
                  <div className="text-sm text-gray-500">{modalUserData?.email}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={closeUserModal}
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                  aria-label="Close"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="px-6 py-6 max-h-[85vh] overflow-y-auto">
              {modalUserLoading ? (
                <div className="text-center py-12">Loading user details...</div>
              ) : modalUserError ? (
                <div className="text-center py-12 text-red-600">Failed to load user details.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left: avatar / quick info */}
                  <div className="md:col-span-1 flex flex-col items-center">
                    <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center mb-4 overflow-hidden">
                      {modalUserData?.image_url ? (
                        <img src={modalUserData.image_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="h-16 w-16 text-gray-400" />
                      )}
                    </div>
                    <div className="text-sm text-gray-600">{modalUserData?.role || "user"}</div>
                    <div className="text-sm text-gray-600 mt-2">Dogs: <span className="font-medium">{modalUserData?.dogs_count ?? (modalUserData?.dogs ? modalUserData.dogs.length : "—")}</span></div>
                    <div className="text-sm text-gray-600">Joined: <span className="font-medium">{fmtDate(modalUserData?.created_at)}</span></div>
                  </div>

                  {/* Right: details */}
                  <div className="md:col-span-2">
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-500 uppercase">Subscription</div>
                          <div className="text-sm font-medium">{(modalUserData?.subscription_tier || "—").replace("_", " ")}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(modalUserData?.subscription_status)}
                          <div className="text-xs text-gray-500">{modalUserData?.subscription_status || "—"}</div>
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-gray-600">
                        Price id: <span className="font-mono text-xs">{modalUserData?.stripe_price_id || "—"}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-500">Name</div>
                        <div className="text-sm font-medium">{modalUserData?.name || "—"}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Email</div>
                        <div className="text-sm font-medium flex items-center"><Mail className="h-4 w-4 mr-2 text-gray-400" />{modalUserData?.email || "—"}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Notes</div>
                        <div className="text-sm text-gray-700">{modalUserData?.notes || "No notes"}</div>
                      </div>

                      <div className="flex space-x-2 mt-4">
                        <button
                          onClick={() => {
                            closeUserModal();
                            // open dogs modal after closing user modal
                            openDogsModal(openUserId, modalUserData?.dogs);
                          }}
                          className="px-3 py-2 rounded bg-white border text-sm hover:bg-gray-50"
                        >
                          View Dogs
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Dogs Modal ---------------- */}
      {openDogsUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeDogsModal}
          />

          <div className="relative max-w-4xl w-full mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6 text-gray-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Dogs</h3>
                  <div className="text-sm text-gray-500">List of dogs for this user</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={closeDogsModal}
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                  aria-label="Close"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="px-6 py-6">
              {modalDogsLoading ? (
                <div className="text-center py-12">Loading dogs...</div>
              ) : modalDogsError ? (
                <div className="text-center py-12 text-red-600">Failed to load dogs.</div>
              ) : !modalDogsData || modalDogsData.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-gray-700">No dogs found for this user</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {modalDogsData.map((dog) => (
                    <div key={dog.id} className="border rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                          {dog.image_url ? (
                            <img src={dog.image_url} alt={dog.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{dog.name || "—"}</div>
                              <div className="text-xs text-gray-500">{dog.breed || "—"}</div>
                            </div>

                            <div className="text-xs text-gray-500">{dog.sex || "—"}</div>
                          </div>

                          <div className="mt-3 text-sm text-gray-600">
                            <div>Weight: <span className="font-medium">{dog.weight_kg ? `${dog.weight_kg} kg` : "—"}</span></div>
                            <div>Born: <span className="font-medium">{dog.date_of_birth ? new Date(dog.date_of_birth).toLocaleDateString() : "—"}</span></div>
                          </div>

                          <div className="mt-3 text-sm text-gray-700">
                            {dog.notes ? dog.notes : <span className="text-gray-400">No notes</span>}
                          </div>

                          <div className="mt-4 flex items-center space-x-2">
                            <Link to={`/admin/protocol-editor/${dog.id}`} className="px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700">Edit Protocols</Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersList;
