import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  AlertTriangle, 
  FileText, 
  Users, 
  Activity,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

const NotificationsPanel: React.FC = () => {
  const { notifications, markNotificationRead } = useAdmin();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'urgent_case': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'new_submission': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'follow_up_needed': return <Clock className="h-5 w-5 text-orange-500" />;
      case 'system_alert': return <Activity className="h-5 w-5 text-purple-500" />;
      default: return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleMarkAsRead = (id: string) => {
    markNotificationRead(id);
  };

  const markAllAsRead = () => {
    notifications.filter(n => !n.isRead).forEach(n => markNotificationRead(n.id));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
            <p className="text-lg text-gray-600">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="mt-4 sm:mt-0 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Mark All as Read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {sortedNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-xl shadow-sm border-l-4 ${getPriorityColor(notification.priority)} p-6 ${
                !notification.isRead ? 'ring-2 ring-blue-100' : ''
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h3>
                      <p className={`mt-1 ${!notification.isRead ? 'text-gray-700' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center space-x-4 mt-3">
                        <span className="text-sm text-gray-500">
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          notification.priority === 'high' ? 'bg-red-100 text-red-800' :
                          notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {notification.priority} priority
                        </span>
                        {!notification.isRead && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {notification.actionUrl && (
                        <Link
                          to={notification.actionUrl}
                          className="text-emerald-600 hover:text-emerald-700 transition-colors flex items-center space-x-1"
                          onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                        >
                          <span className="text-sm font-medium">View</span>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      )}
                      
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {notifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">You're all caught up! New notifications will appear here.</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Urgent Cases</p>
                <p className="text-2xl font-bold text-gray-900">
                  {notifications.filter(n => n.type === 'urgent_case' && !n.isRead).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">New Submissions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {notifications.filter(n => n.type === 'new_submission' && !n.isRead).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Follow-ups</p>
                <p className="text-2xl font-bold text-gray-900">
                  {notifications.filter(n => n.type === 'follow_up_needed' && !n.isRead).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPanel;