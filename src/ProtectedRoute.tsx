import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken } from "./env";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = getToken();
  const location = useLocation();

  if (!token) {
    // No token, redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Optional: You can also validate token structure or expiry here

  return <>{children}</>;
};

export default ProtectedRoute;
