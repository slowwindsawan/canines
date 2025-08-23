import React from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "./env"; // your helper to check JWT

interface Props {
  children: React.ReactNode;
}

const PublicRoute: React.FC<Props> = ({ children }) => {
  const token = getToken();

  if (token) {
    // If logged in, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // Otherwise, allow access to login/signup
  return <>{children}</>;
};

export default PublicRoute;
