import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  createStatus,
  deleteStatus,
  getBorrowed,
  getLentOut,
  getLibrary,
  getWishlist,
  lendStatus,
  listStatuses,
  returnStatus,
  updateStatus,
} from "./statuses";

describe("statuses api client", () => {
  it("lists statuses as a plain array (not paginated)", async () => {
    server.use(
      http.get("/api/me/statuses", () => HttpResponse.json([{ id: "s1", status: "owned" }])),
    );
    const result = await listStatuses();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe("s1");
  });

  it("filters listStatuses by status query param", async () => {
    server.use(
      http.get("/api/me/statuses", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("status")).toBe("wishlist");
        return HttpResponse.json([]);
      }),
    );
    await listStatuses("wishlist");
  });

  it("creates a status", async () => {
    server.use(
      http.post("/api/me/statuses", () =>
        HttpResponse.json({ id: "s1", status: "owned" }, { status: 201 }),
      ),
    );
    const result = await createStatus({ book_id: "b1", status: "owned" });
    expect(result.id).toBe("s1");
  });

  it("updates a status", async () => {
    server.use(
      http.patch("/api/me/statuses/:id", () => HttpResponse.json({ id: "s1", status: "wishlist" })),
    );
    const result = await updateStatus("s1", { status: "wishlist" });
    expect(result.status).toBe("wishlist");
  });

  it("deletes a status", async () => {
    server.use(http.delete("/api/me/statuses/:id", () => new HttpResponse(null, { status: 204 })));
    await expect(deleteStatus("s1")).resolves.toBeUndefined();
  });

  it("lends a status", async () => {
    server.use(
      http.post("/api/me/statuses/:id/lend", () =>
        HttpResponse.json({ id: "s1", status: "lent_out", lent_to_name: "Alex" }),
      ),
    );
    const result = await lendStatus("s1", { lent_to_name: "Alex" });
    expect(result.lent_to_name).toBe("Alex");
  });

  it("returns a status", async () => {
    server.use(
      http.post("/api/me/statuses/:id/return", () =>
        HttpResponse.json({ id: "s1", status: "owned", returned_at: "2026-07-21T00:00:00Z" }),
      ),
    );
    const result = await returnStatus("s1");
    expect(result.returned_at).not.toBeNull();
  });

  it("fetches library, wishlist, lent-out, borrowed as paginated views", async () => {
    server.use(
      http.get("/api/me/library", () =>
        HttpResponse.json({ items: [], total: 0, limit: 10, offset: 0 }),
      ),
      http.get("/api/me/wishlist", () =>
        HttpResponse.json({ items: [], total: 0, limit: 10, offset: 0 }),
      ),
      http.get("/api/me/lent-out", () =>
        HttpResponse.json({ items: [], total: 0, limit: 10, offset: 0 }),
      ),
      http.get("/api/me/borrowed", () =>
        HttpResponse.json({ items: [], total: 0, limit: 10, offset: 0 }),
      ),
    );
    await expect(getLibrary()).resolves.toMatchObject({ items: [] });
    await expect(getWishlist()).resolves.toMatchObject({ items: [] });
    await expect(getLentOut()).resolves.toMatchObject({ items: [] });
    await expect(getBorrowed()).resolves.toMatchObject({ items: [] });
  });
});
