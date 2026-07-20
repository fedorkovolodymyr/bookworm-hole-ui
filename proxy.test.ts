import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("proxy", () => {
  it("redirects to /login when no access_token cookie is present on an (app) route", () => {
    const request = new NextRequest("http://localhost/profile");
    const response = proxy(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("passes through when an access_token cookie is present", () => {
    const request = new NextRequest("http://localhost/profile", {
      headers: { cookie: "access_token=some-token" },
    });
    const response = proxy(request);
    expect(response.status).toBe(200);
  });

  it("passes through auth routes regardless of cookie state", () => {
    const request = new NextRequest("http://localhost/login");
    const response = proxy(request);
    expect(response.status).toBe(200);
  });

  it("redirects to /login with a from param when no access_token cookie is present on an admin route", () => {
    const request = new NextRequest("http://localhost/admin/catalog/books");
    const response = proxy(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
    expect(response.headers.get("location")).toContain(
      `from=${encodeURIComponent("/admin/catalog/books")}`,
    );
  });

  it("passes through an admin route when an access_token cookie is present (deeper is_admin check happens server-side)", () => {
    const request = new NextRequest("http://localhost/admin/catalog/books", {
      headers: { cookie: "access_token=some-token" },
    });
    const response = proxy(request);
    expect(response.status).toBe(200);
  });

  it("passes through a public path like /books regardless of cookie state", () => {
    const request = new NextRequest("http://localhost/books");
    const response = proxy(request);
    expect(response.status).toBe(200);
  });
});
