// lib/api/client.ts
import axios from "axios";
import Cookies from "js-cookie";

export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
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
      } catch {
        refreshPromise = null;
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);
