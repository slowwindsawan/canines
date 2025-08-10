import React from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { 
  Users, 
  FileText, 
  Bell, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Shield
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { adminUser, submissions, notifications } = useAdmin();

  const pendingSubmissions = submissions.filter(s => s.status === 'pending').length;
  const urgentCases = submissions.filter(s => s.aiDiagnosis.urgencyLevel === 'urgent').length;
  const unreadNotifications = notifications.filter(n => !n.isRead).length;
  const underReview = submissions.filter(s => s.status === 'under_review').length;

  const quickStats = [
    {
      title: 'Pending Reviews',
      value: pendingSubmissions,
      icon: Clock,
      color: 'bg-yellow-50 text-yellow-600',
      href: '/admin/submissions?status=pending'
    },
    {
      title: 'Urgent Cases',
      value: urgentCases,
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600',
      href: '/admin/submissions?priority=urgent'
    },
    {
      title: 'Under Review',
      value: underReview,
      icon: FileText,
      color: 'bg-blue-50 text-blue-600',
      href: '/admin/submissions?status=under_review'
    },
    {
      title: 'Notifications',
      value: unreadNotifications,
      icon: Bell,
      color: 'bg-purple-50 text-purple-600',
      href: '/admin/notifications'
    },
  ];

  const quickActions = [
    {
      title: 'Review Queue',
      description: 'Review pending diagnoses and treatment plans',
      icon: FileText,
      href: '/admin/submissions',
      color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
      iconColor: 'text-emerald-600'
    },
    {
      title: 'Notifications',
      description: 'View system alerts and case updates',
      icon: Bell,
      href: '/admin/notifications',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Audit Logs',
      description: 'Track all system actions and changes',
      icon: Shield,
      href: '/admin/audit',
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
      iconColor: 'text-orange-600'
    },
  ];

  const recentActivity = submissions
    .filter(s => s.reviewedAt)
    .sort((a, b) => new Date(b.reviewedAt!).getTime() - new Date(a.reviewedAt!).getTime())
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
              <p className="text-lg text-gray-600">
                Welcome back, {adminUser?.name} ({adminUser?.role})
              </p>
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
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                </div>
              </Link>
            );
          })}
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
                  <div className={`p-3 rounded-lg bg-white ${action.iconColor}`}>
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

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Activity className="h-6 w-6 text-gray-500" />
            <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
          </div>
          
          <div className="space-y-4">
            {recentActivity.map((submission) => (
              <div key={submission.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {submission.status === 'approved' ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <Clock className="h-8 w-8 text-yellow-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {submission.userName} - {submission.dogData.breed}
                  </p>
                  <p className="text-sm text-gray-500">
                    Status: {submission.status.replace('_', ' ')} • 
                    {submission.reviewedAt && ` Reviewed ${new Date(submission.reviewedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Link
                    to={`/admin/submissions/${submission.id}`}
                    className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {recentActivity.length === 0 && (
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