// env.js
import axios from "axios";

const BASE_URL = "http://localhost:8000";

/**
 * Helper to get JWT token from localStorage
 */
const getToken = () => {
  try {
    return localStorage.getItem("jwt_token") || null;
  } catch (err) {
    console.error("Error fetching token:", err);
    return null;
  }
};

/**
 * Redirect to login page
 */
const handleUnauthorized = () => {
  window.location.href = "/login"; // navigate to login
};

/**
 * Make an authenticated request (JWT)
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {string} method - HTTP method (default: GET)
 * @param {object|FormData} body - JSON payload or FormData
 * @param {boolean} isFormData - whether the body is FormData
 */
const jwtRequest = async (endpoint, method = "GET", body = null, isFormData = false) => {
  const token = getToken();
  if (!token) {
    handleUnauthorized();
    return;
  }

  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  headers["Authorization"] = `Bearer ${token}`;

  try {
    const response = await axios({
      url: `${BASE_URL}${endpoint}`,
      method,
      headers,
      data: body,
    });

    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      handleUnauthorized();
      return;
    }
    console.error("JWT request failed:", error);
    throw error;
  }
};

/**
 * Make a public request (no JWT)
 */
const publicRequest = async (endpoint: string, method = "GET", body: any = null) => {
  try {
    const response = await axios({
      url: `${BASE_URL}${endpoint}`,
      method,
      headers: { "Content-Type": "application/json" },
      data: body,
    });

    return response.data;
  } catch (error: any) {
    console.error("Public request failed:", error);
    throw error;
  }
};

export {
  BASE_URL,
  jwtRequest,
  publicRequest,
  getToken,
};
