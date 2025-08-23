import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken } from "./env";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const token = getToken();
  const location = useLocation();

  // Example: check if user is admin
  const isAdmin = localStorage.getItem("is_admin") === "true"; // or decode token

  if (!token || !isAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
