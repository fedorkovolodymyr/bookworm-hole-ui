import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { getRelease, getReleaseReviews, getReleaseHistory, getReleaseVersion } from "./releases";

describe("releases api client", () => {
  it("gets a release", async () => {
    server.use(
      http.get("/api/releases/:id", ({ params }) =>
        HttpResponse.json({
          id: params.id,
          isbn13: "1234567890123",
          isbn10: null,
          isbns: [],
        }),
      ),
    );
    const result = await getRelease("rel1");
    expect(result.id).toBe("rel1");
  });

  it("gets release history", async () => {
    server.use(
      http.get("/api/releases/:id/history", () =>
        HttpResponse.json({
          items: [{ id: "v1", version_number: 1, entity_type: "release", entity_id: "rel1", changed_by_user_id: null, change_source: "system", contribution_id: null, created_at: "2026-01-01T00:00:00Z" }],
          total: 1,
          limit: 10,
          offset: 0,
        }),
      ),
    );
    const result = await getReleaseHistory("rel1");
    expect(result.items[0].version_number).toBe(1);
  });

  it("gets a specific release version", async () => {
    server.use(
      http.get("/api/releases/:id/history/:version", ({ params }) =>
        HttpResponse.json({
          id: "v1",
          entity_type: "release",
          entity_id: "rel1",
          version_number: parseInt(params.version as string, 10),
          changed_by_user_id: null,
          change_source: "system",
          contribution_id: null,
          created_at: "2026-01-01T00:00:00Z",
          snapshot: { format: "hardcover" },
        }),
      ),
    );
    const result = await getReleaseVersion("rel1", 1);
    expect(result.version_number).toBe(1);
  });

  describe("getReleaseReviews", () => {
    it("fetches reviews for a release", async () => {
      server.use(
        http.get("/api/releases/:id/reviews", () =>
          HttpResponse.json({ items: [{ id: "r1" }], total: 1, limit: 10, offset: 0 }),
        ),
      );
      const result = await getReleaseReviews("rel1");
      expect(result.items[0].id).toBe("r1");
    });
  });
});
