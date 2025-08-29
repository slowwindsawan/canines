import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { Shield, Menu, X, Bell } from 'lucide-react';
import logo from "./logo.png"

const AdminNavbar: React.FC = () => {
  const { adminUser, notifications } = useAdmin();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/admin' },
    { name: 'Submissions', href: '/admin/submissions' },
    { name: 'Messages', href: '/admin/messages' },
    // { name: 'Notifications', href: '/admin/notifications' },
    // { name: 'Audit Logs', href: '/admin/audit' },
    { name: 'Settings', href: '/admin/settings' },
  ];

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/admin" className="flex items-center space-x-2">
              <img className="w-[200px] b-2" src={logo} />
              <span className="text-xl font-bold text-gray-900">Admin Panel</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {adminUser && (
              <>
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href)
                        ? 'text-red-600 border-b-2 border-red-600'
                        : 'text-gray-600 hover:text-red-600'
                    } px-3 py-2 text-sm font-medium transition-colors relative`}
                  >
                    {item.name}
                    {item.name === 'Notifications' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                ))}
              </>
            )}
          </div>

          {/* Mobile menu button */}
          {adminUser && (
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600 hover:text-gray-900"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {adminUser && isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  isActive(item.href)
                    ? 'text-red-600 bg-red-50'
                    : 'text-gray-600 hover:text-red-600'
                } block px-3 py-2 text-base font-medium transition-colors relative`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
                {item.name === 'Notifications' && unreadCount > 0 && (
                  <span className="absolute top-2 right-3 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            ))}
            <div className="border-t border-gray-200 pt-4 pb-3">
              <div className="px-3">
                <p className="text-sm text-gray-600 mb-2">
                  {adminUser.name} ({adminUser.role})
                </p>
                <Link
                  to="/dashboard"
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors block text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  User View
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default AdminNavbar;