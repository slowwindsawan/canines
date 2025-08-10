import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DogProvider } from "./context/DogContext";
import { AdminProvider } from "./context/AdminContext";
import Navbar from "./components/Navbar";
import AdminNavbar from "./components/AdminNavbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Intake from "./pages/Intake";
import Protocol from "./pages/Protocol";
import Tracker from "./pages/Tracker";
import Tiers from "./pages/Tiers";
import Education from "./pages/Education";
import Account from "./pages/Account";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SubmissionsList from "./pages/admin/SubmissionsList";
import SubmissionReview from "./pages/admin/SubmissionReview";
import NotificationsPanel from "./pages/admin/NotificationsPanel";
import AuditLogs from "./pages/admin/AuditLogs";
import AIChatbot from "./components/AIChatbot";
import { MessageProvider } from "./context/MessageContext";
import Messages from "./pages/admin/Messages";
import Settings from "./pages/admin/Settings";

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

function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <MessageProvider>
          <Router>
            <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

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
                path="/intake"
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

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </MessageProvider>
      </AdminProvider>
    </AuthProvider>
  );
}

export default App;
