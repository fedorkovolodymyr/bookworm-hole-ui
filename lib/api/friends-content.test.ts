// lib/api/friends-content.test.ts
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { getFriendCollections, getFriendLibrary } from "./friends-content";

describe("friends-content api client", () => {
  it("fetches a friend's public collections", async () => {
    server.use(
      http.get("/api/friends/:userId/collections", () =>
        HttpResponse.json({ items: [{ id: "c1" }], total: 1, limit: 10, offset: 0 }),
      ),
    );
    const result = await getFriendCollections("u1");
    expect(result.items[0].id).toBe("c1");
  });

  it("fetches a friend's library", async () => {
    server.use(
      http.get("/api/friends/:userId/library", () =>
        HttpResponse.json({ items: [{ id: "s1" }], total: 1, limit: 10, offset: 0 }),
      ),
    );
    const result = await getFriendLibrary("u1");
    expect(result.items[0].id).toBe("s1");
  });

  it("surfaces a 403 for a non-friend or private collection", async () => {
    server.use(
      http.get("/api/friends/:userId/collections", () =>
        HttpResponse.json({ detail: "Not friends" }, { status: 403 }),
      ),
    );
    await expect(getFriendCollections("stranger")).rejects.toMatchObject({
      response: { status: 403 },
    });
  });
});
