import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

/** Build a JWT-shaped string (header.payload.signature) for test fixtures.
 * Only the payload segment is real; decodeJwtPayload never touches the
 * other two, so header/signature are placeholders. */
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.placeholder-signature`;
}

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

  it("passes through an admin route when the token decodes with is_admin: true", () => {
    const token = makeJwt({ sub: "user-1", is_admin: true });
    const request = new NextRequest("http://localhost/admin/catalog/books", {
      headers: { cookie: `access_token=${token}` },
    });
    const response = proxy(request);
    expect(response.status).toBe(200);
  });

  it("redirects to / (fast path) when the token decodes with is_admin: false", () => {
    const token = makeJwt({ sub: "user-1", is_admin: false });
    const request = new NextRequest("http://localhost/admin/catalog/books", {
      headers: { cookie: `access_token=${token}` },
    });
    const response = proxy(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("falls through to NextResponse.next() when the token decodes but has no is_admin claim (pre-#144 token)", () => {
    const token = makeJwt({ sub: "user-1" });
    const request = new NextRequest("http://localhost/admin/catalog/books", {
      headers: { cookie: `access_token=${token}` },
    });
    const response = proxy(request);
    expect(response.status).toBe(200);
  });

  it("does not crash and falls through to NextResponse.next() for a malformed/garbage token", () => {
    const request = new NextRequest("http://localhost/admin/catalog/books", {
      headers: { cookie: "access_token=not-a-real-jwt" },
    });
    const response = proxy(request);
    expect(response.status).toBe(200);
  });
});
