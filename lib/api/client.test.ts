// lib/api/client.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import Cookies from "js-cookie";
import type { AxiosError } from "axios";

vi.mock("js-cookie", () => ({
  default: { get: vi.fn() },
}));

describe("apiClient", () => {
  beforeEach(() => {
    (Cookies.get as unknown as ReturnType<typeof vi.fn>).mockReturnValue("test-csrf-token");
  });

  it("attaches X-CSRF-Token header from cookie on POST requests", async () => {
    const { apiClient } = await import("./client");
    const config = apiClient.interceptors.request as unknown as {
      handlers: {
        fulfilled: (
          c: import("axios").InternalAxiosRequestConfig,
        ) => import("axios").InternalAxiosRequestConfig;
      }[];
    };
    const result = config.handlers[0].fulfilled({
      method: "post",
      headers: {} as import("axios").AxiosRequestHeaders,
    } as import("axios").InternalAxiosRequestConfig);
    expect(result.headers["X-CSRF-Token"]).toBe("test-csrf-token");
  });

  it("does not attach X-CSRF-Token header on GET requests", async () => {
    const { apiClient } = await import("./client");
    const config = apiClient.interceptors.request as unknown as {
      handlers: {
        fulfilled: (
          c: import("axios").InternalAxiosRequestConfig,
        ) => import("axios").InternalAxiosRequestConfig;
      }[];
    };
    const result = config.handlers[0].fulfilled({
      method: "get",
      headers: {} as import("axios").AxiosRequestHeaders,
    } as import("axios").InternalAxiosRequestConfig);
    expect(result.headers["X-CSRF-Token"]).toBeUndefined();
  });
});

describe("apiClient response interceptor", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    (Cookies.get as unknown as ReturnType<typeof vi.fn>).mockReturnValue("test-csrf-token");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, href: "" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  function make401Error(url: string): AxiosError {
    return {
      isAxiosError: true,
      config: { url, _retry: false },
      response: { status: 401, data: {}, statusText: "", headers: {}, config: {} as never },
      name: "AxiosError",
      message: "Request failed with status code 401",
      toJSON: () => ({}),
    } as unknown as AxiosError;
  }

  it("does not redirect to /login when refresh fails due to a missing refresh token (guest)", async () => {
    const { apiClient } = await import("./client");
    vi.spyOn(apiClient, "post").mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { detail: "No refresh token" } },
      toJSON: () => ({}),
    });

    const rejected = apiClient.interceptors.response as unknown as {
      handlers: { rejected: (e: AxiosError) => Promise<unknown> }[];
    };
    await rejected.handlers[0].rejected(make401Error("/users/me")).catch(() => {});

    expect(window.location.href).toBe("");
  });

  it("redirects to /login when refresh fails for a real session expiry", async () => {
    const { apiClient } = await import("./client");
    vi.spyOn(apiClient, "post").mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { detail: "Refresh failed" } },
      toJSON: () => ({}),
    });

    const rejected = apiClient.interceptors.response as unknown as {
      handlers: { rejected: (e: AxiosError) => Promise<unknown> }[];
    };
    await rejected.handlers[0].rejected(make401Error("/collections")).catch(() => {});

    expect(window.location.href).toBe("/login");
  });
});
