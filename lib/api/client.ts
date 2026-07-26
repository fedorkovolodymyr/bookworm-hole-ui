// lib/api/client.ts
import axios from "axios";
import Cookies from "js-cookie";
import { NO_REFRESH_TOKEN_DETAIL } from "@/lib/auth/constants";

export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 15000,
});

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

apiClient.interceptors.request.use((config) => {
  if (config.method && MUTATING_METHODS.has(config.method.toLowerCase())) {
    const csrfToken = Cookies.get("csrf_token");
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }
  return config;
});

let refreshPromise: Promise<void> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/auth/refresh"
    ) {
      originalRequest._retry = true;
      try {
        refreshPromise ??= apiClient.post("/auth/refresh").then(() => undefined);
        await refreshPromise;
        refreshPromise = null;
        return apiClient(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        // "No refresh token" means the visitor was never logged in (e.g. a
        // guest browsing a public page) — that's expected, not a session
        // expiry, so don't redirect. Any other failure (expired/invalid
        // refresh token) means a real session lapsed and redirecting to
        // login is correct.
        const detail = axios.isAxiosError(refreshError)
          ? (refreshError.response?.data as { detail?: string } | undefined)?.detail
          : undefined;
        if (detail !== NO_REFRESH_TOKEN_DETAIL && typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);
