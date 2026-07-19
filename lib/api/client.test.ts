// lib/api/client.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import Cookies from "js-cookie";

vi.mock("js-cookie", () => ({
  default: { get: vi.fn() },
}));

describe("apiClient", () => {
  beforeEach(() => {
    (Cookies.get as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "test-csrf-token",
    );
  });

  it("attaches X-CSRF-Token header from cookie on POST requests", async () => {
    const { apiClient } = await import("./client");
    const config = apiClient.interceptors.request as unknown as {
      handlers: { fulfilled: (c: import("axios").InternalAxiosRequestConfig) => import("axios").InternalAxiosRequestConfig }[];
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
      handlers: { fulfilled: (c: import("axios").InternalAxiosRequestConfig) => import("axios").InternalAxiosRequestConfig }[];
    };
    const result = config.handlers[0].fulfilled({
      method: "get",
      headers: {} as import("axios").AxiosRequestHeaders,
    } as import("axios").InternalAxiosRequestConfig);
    expect(result.headers["X-CSRF-Token"]).toBeUndefined();
  });
});
