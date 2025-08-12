import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Bell, Heart, Menu, X } from "lucide-react";
import logo from "./logo.png";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Education", href: "/education" },
    { name: "Account", href: "/account" },
    { name: "Subscription", href: "/subscription" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-primary-200 shadow-sm border-b border-primary-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-dark-900">
                <img className="w-[150px] sm:w-[200px]" src={logo} />
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user && (
              <>
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href)
                        ? "text-dark-900 border-b-2 border-dark-900"
                        : "text-dark-700 hover:text-dark-900"
                    } px-3 py-2 text-sm font-medium transition-colors`}
                  >
                    {item.name}
                  </Link>
                ))}
                <div>
                  <Bell size={20} />
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-dark-700">
                    Welcome, {user.name}
                  </span>
                  <Link
                    to="/admin"
                    className="bg-primary-300 hover:bg-primary-400 text-dark-800 px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                  >
                    Admin
                  </Link>
                  <button
                    onClick={logout}
                    className="bg-primary-400 hover:bg-primary-500 text-dark-800 px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                  >
                    Log Out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          {user && (
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-dark-700 hover:text-dark-900"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {user && isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-primary-100 border-t border-primary-400">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  isActive(item.href)
                    ? "text-dark-900 bg-primary-300"
                    : "text-dark-700 hover:text-dark-900"
                } block px-3 py-2 text-base font-medium transition-colors`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="border-t border-primary-400 pt-4 pb-3">
              <div className="px-3">
                <p className="text-sm text-dark-700 mb-2">
                  Welcome, {user.name}
                </p>
                <Link
                  to="/admin"
                  className="w-full bg-primary-300 hover:bg-primary-400 text-dark-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors block text-center mb-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin Panel
                </Link>
                <button
                  onClick={logout}
                  className="w-full bg-primary-400 hover:bg-primary-500 text-dark-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
