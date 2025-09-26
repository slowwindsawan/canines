import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DogProvider } from "./context/DogContext";
import { AdminProvider } from "./context/AdminContext";
import { MessageProvider } from "./context/MessageContext";

import Navbar from "./components/Navbar";
import AdminNavbar from "./components/AdminNavbar";
import Footer from "./components/Footer";
import AIChatbot from "./components/AIChatbot";

import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Intake from "./pages/Intake";
import Tiers from "./pages/Tiers";
import Education from "./pages/Education";
import Account from "./pages/Account";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SubmissionsList from "./pages/admin/SubmissionsList";
import SubmissionReview from "./pages/admin/SubmissionReview";
import NotificationsPanel from "./pages/admin/NotificationsPanel";
import AuditLogs from "./pages/admin/AuditLogs";
import Messages from "./pages/admin/Messages";
import Settings from "./pages/admin/Settings";
import ProtocolEditor from "./pages/ProtocolEditor";
import PublicRoute from "./PublicRoute";
import BlogEditor from "./pages/BlogEditor";
import BlogList from "./pages/BlogList";
import UsersList from "./pages/admin/UsersList";

// Layouts
const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col">
    <AdminNavbar />
    <main className="flex-1">{children}</main>
  </div>
);

const UserLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DogProvider>
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <AIChatbot />
    </div>
  </DogProvider>
);

const App: React.FC = () => {
  useEffect(() => {
    async function loadRemoteCSS() {
      try {
        const res = await fetch(
          "https://pub-ca340ec4947844b7b26bbdd00685b95c.r2.dev/styles.css", { cache: 'no-store' }
        );
        if (!res.ok) throw new Error("Failed to fetch CSS");

        const cssText = await res.text();

        const styleTag = document.createElement("style");
        styleTag.innerHTML = cssText;
        document.head.appendChild(styleTag);
      } catch (err) {
        console.error("Error loading CSS:", err);
      }
    }

    loadRemoteCSS();
  }, []);
  return (
    <AuthProvider>
      <AdminProvider>
        <MessageProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <Signup />
                  </PublicRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <AdminDashboard />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/blogs"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <BlogList />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/blog-editor"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <BlogEditor />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <Settings />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/submissions"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <SubmissionsList />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <UsersList />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/protocol-editor/:id"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <ProtocolEditor />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/submissions/:id"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <SubmissionReview />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/messages"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <Messages />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/notifications"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <NotificationsPanel />
                    </AdminLayout>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <AdminRoute>
                    <AdminLayout>
                      <AuditLogs />
                    </AdminLayout>
                  </AdminRoute>
                }
              />

              {/* User Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <UserLayout>
                      <Dashboard />
                    </UserLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/intake/:id?"
                element={
                  <ProtectedRoute>
                    <UserLayout>
                      <Intake />
                    </UserLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tiers"
                element={
                  <ProtectedRoute>
                    <UserLayout>
                      <Tiers />
                    </UserLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/education"
                element={
                  <ProtectedRoute>
                    <UserLayout>
                      <Education />
                    </UserLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <UserLayout>
                      <Account />
                    </UserLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subscription"
                element={
                  <ProtectedRoute>
                    <UserLayout>
                      <Tiers />
                    </UserLayout>
                  </ProtectedRoute>
                }
              />

              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              {/* Optional: catch-all redirect */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </MessageProvider>
      </AdminProvider>
    </AuthProvider>
  );
};

export default App;
