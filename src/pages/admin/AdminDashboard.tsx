import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import {
  Users,
  FileText,
  Bell,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Shield,
  Notebook,
  NotebookIcon,
} from "lucide-react";
import { jwtRequest } from "../../env";
import { useGlobalStore } from "../../globalStore";

const AdminDashboard: React.FC = () => {
  const { adminUser, notifications } = useAdmin();
  const [submissions, setSubmissions] = React.useState([]);
  const { adminSettings, setAdminSettings } = useGlobalStore();
  const [tip, setTip] = useState("");
  const [saving, setSaving] = useState(false);

  const pendingSubmissions = submissions.filter(
    (s) => s.status === "pending"
  ).length;
  const urgentCases = submissions.filter(
    (s) => s.priority === "urgent" || s.priority === "high"
  ).length;
  const unreadNotifications = notifications.filter((n) => !n.isRead).length;
  const underReview = submissions.filter(
    (s) => s.status === "in_review"
  ).length;

  useEffect(() => {
    console.log(adminSettings);
  }, [adminSettings]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await jwtRequest("/admin/settings/tip", "PUT", { tip });
      if (res?.success) {
        setAdminSettings({...adminSettings, tip: tip})
        alert("Tip saved successfully.");
      } else {
        console.error("save failed:", res);
        alert("Failed to save tip.");
      }
    } catch (err) {
      console.error("save err:", err);
      alert("Error saving tip.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    try {
      // send to backend
      (async () => {
        const response = await jwtRequest(`/admin/settings`, "GET");
        console.log(response);
        setAdminSettings(response);
      })();
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    // Fetch all submissions sorted by latest date
    const fetchAllSubmissions = async () => {
      try {
        const data = await jwtRequest("/submissions/latest", "POST"); // your FastAPI endpoint
        console.log("All submissions:", data);
        setSubmissions(data);
        return data;
      } catch (err) {
        console.error("Failed to fetch submissions:", err);
      }
    };

    // Usage example
    fetchAllSubmissions().then((submissions) => {
      console.warn("Fetched submissions:", submissions);
    });
  }, []);

  const quickStats = [
    {
      title: "Pending Reviews",
      value: pendingSubmissions,
      icon: Clock,
      color: "bg-yellow-50 text-yellow-600",
      href: "/admin/submissions?status=pending",
    },
    {
      title: "Urgent Cases",
      value: urgentCases,
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600",
      href: "/admin/submissions?priority=urgent",
    },
    // {
    //   title: "Notifications",
    //   value: unreadNotifications,
    //   icon: Bell,
    //   color: "bg-purple-50 text-purple-600",
    //   href: "/admin/notifications",
    // },
  ];

  const quickActions = [
    // {
    //   title: 'Review Queue',
    //   description: 'Review pending diagnoses and treatment plans',
    //   icon: FileText,
    //   href: '/admin/submissions',
    //   color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    //   iconColor: 'text-emerald-600'
    // },
    // {
    //   title: 'Notifications',
    //   description: 'View system alerts and case updates',
    //   icon: Bell,
    //   href: '/admin/notifications',
    //   color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    //   iconColor: 'text-purple-600'
    // }
  ];

  const recentActivity = submissions
    .filter((s) => s.reviewedAt)
    .sort(
      (a, b) =>
        new Date(b.reviewedAt!).getTime() - new Date(a.reviewedAt!).getTime()
    )
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Admin Dashboard
              </h1>
              <p className="text-lg text-gray-600">Welcome back, Dr. Lauren</p>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-col items-start sm:items-end">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-600">System Status</span>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                All Systems Operational
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Link
                key={index}
                to={stat.href}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                </div>
              </Link>
            );
          })}
          <Link
            to={"/admin/blogs"}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Educational contents
                </p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  Edit your educational posts
                </p>
              </div>
              <div className={`p-3 rounded-lg bg-green-50 text-green-600`}>
                <Notebook className="h-6 w-6" />
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {quickActions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <Link
                key={index}
                to={action.href}
                className={`${action.color} border rounded-xl p-6 transition-all duration-200 hover:shadow-md group`}
              >
                <div className="flex items-start space-x-4">
                  <div
                    className={`p-3 rounded-lg bg-white ${action.iconColor}`}
                  >
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Tips editor */}
        <section className="p-4 rounded-lg bg-brand-offwhite text-brand-charcoal mb-6">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Daily Gut Tips For Your Users</h3>
            <div className="text-sm text-brand-midgrey">
              {saving ? "Saving…" : "Editable"}
            </div>
          </header>

          <textarea
            value={adminSettings?.tip}
            onChange={(e) => setTip(e.target.value)}
            placeholder="Write a helpful tip for users (max 2000 chars)…"
            maxLength={2000}
            rows={8}
            className="w-full p-3 rounded-md shadow-sm border-0 resize-vertical text-sm leading-6 bg-white text-brand-charcoal"
          />

          <div className="mt-3 flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className={`px-4 py-2 rounded-md font-medium ${
                saving 
                  ? "bg-brand-midgrey text-brand-offwhite cursor-not-allowed"
                  : "bg-brand-charcoal text-brand-offwhite"
              }`}
            >
              {saving ? "Saving…" : "Save"}
            </button>

            <div className="ml-auto text-xs text-brand-midgrey">
              {tip.length}/2000
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Activity className="h-6 w-6 text-gray-500" />
            <h3 className="text-xl font-semibold text-gray-900">
              Recent Activity
            </h3>
          </div>

          <div className="space-y-4">
            {adminSettings?.activities?.map((submission) => (
              <div
                key={`${submission.dog_id}-${submission.timestamp}`}
                className="p-4 mb-2 rounded-md bg-brand-midgrey text-white border border-white/10"
              >
                <p className="text-sm font-medium">{submission.message}</p>
                <p className="text-xs text-white/60">
                  Status: {submission.status} ·{" "}
                  {new Date(submission.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {!adminSettings?.activities?.length && (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent activity to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
