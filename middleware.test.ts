import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

describe("middleware", () => {
  it("redirects to /login when no access_token cookie is present on an (app) route", () => {
    const request = new NextRequest("http://localhost/profile");
    const response = middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("passes through when an access_token cookie is present", () => {
    const request = new NextRequest("http://localhost/profile", {
      headers: { cookie: "access_token=some-token" },
    });
    const response = middleware(request);
    expect(response.status).toBe(200);
  });

  it("passes through auth routes regardless of cookie state", () => {
    const request = new NextRequest("http://localhost/login");
    const response = middleware(request);
    expect(response.status).toBe(200);
  });
});
