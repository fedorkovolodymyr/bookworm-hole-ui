import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { getPublicProfile, getUserReviews } from "./users";

describe("users API client (public profile)", () => {
  it("getPublicProfile fetches /users/:username", async () => {
    server.use(
      http.get("/api/users/bob", () =>
        HttpResponse.json({
          username: "bob",
          display_name: "Bob",
          bio: null,
          avatar_url: null,
          collections: { items: [], total: 0, limit: 20, offset: 0 },
        }),
      ),
    );
    const result = await getPublicProfile("bob");
    expect(result.username).toBe("bob");
  });

  it("getPublicProfile passes skip/limit as query params", async () => {
    server.use(
      http.get("/api/users/bob", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("skip")).toBe("10");
        expect(url.searchParams.get("limit")).toBe("5");
        return HttpResponse.json({
          username: "bob",
          display_name: "Bob",
          bio: null,
          avatar_url: null,
          collections: { items: [], total: 0, limit: 5, offset: 10 },
        });
      }),
    );
    await getPublicProfile("bob", { skip: 10, limit: 5 });
  });

  it("getUserReviews fetches /users/:userId/reviews", async () => {
    server.use(
      http.get("/api/users/u1/reviews", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
    );
    const result = await getUserReviews("u1");
    expect(result.items).toEqual([]);
  });

  it("getUserReviews passes sort/skip/limit as query params", async () => {
    server.use(
      http.get("/api/users/u1/reviews", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("sort")).toBe("rating");
        return HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 });
      }),
    );
    await getUserReviews("u1", { sort: "rating" });
  });
});
