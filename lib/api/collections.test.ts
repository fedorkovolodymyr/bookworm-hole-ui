import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  addCollectionItem,
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  removeCollectionItem,
  reorderCollectionItems,
  updateCollection,
  updateCollectionItem,
} from "./collections";

describe("collections api client", () => {
  it("lists collections", async () => {
    server.use(
      http.get("/api/collections", () =>
        HttpResponse.json({ items: [{ id: "c1", name: "Favorites" }], total: 1, limit: 10, offset: 0 }),
      ),
    );
    const result = await listCollections();
    expect(result.items[0].name).toBe("Favorites");
  });

  it("gets a collection detail", async () => {
    server.use(
      http.get("/api/collections/:id", ({ params }) =>
        HttpResponse.json({
          id: params.id,
          name: "Favorites",
          items: { items: [], total: 0, limit: 10, offset: 0 },
        }),
      ),
    );
    const result = await getCollection("c1");
    expect(result.id).toBe("c1");
  });

  it("creates a collection", async () => {
    server.use(
      http.post("/api/collections", async ({ request }) => {
        const body = (await request.json()) as { name: string };
        return HttpResponse.json({ id: "c1", name: body.name }, { status: 201 });
      }),
    );
    const result = await createCollection({ name: "Favorites" });
    expect(result.id).toBe("c1");
  });

  it("updates a collection", async () => {
    server.use(
      http.patch("/api/collections/:id", () => HttpResponse.json({ id: "c1", name: "Updated" })),
    );
    const result = await updateCollection("c1", { name: "Updated" });
    expect(result.name).toBe("Updated");
  });

  it("deletes a collection", async () => {
    server.use(http.delete("/api/collections/:id", () => new HttpResponse(null, { status: 204 })));
    await expect(deleteCollection("c1")).resolves.toBeUndefined();
  });

  it("adds a collection item", async () => {
    server.use(
      http.post("/api/collections/:id/items", () =>
        HttpResponse.json({ id: "i1", collection_id: "c1", book_id: "b1" }, { status: 201 }),
      ),
    );
    const result = await addCollectionItem("c1", { book_id: "b1" });
    expect(result.id).toBe("i1");
  });

  it("updates a collection item", async () => {
    server.use(
      http.patch("/api/collections/:id/items/:itemId", () =>
        HttpResponse.json({ id: "i1", note: "great read" }),
      ),
    );
    const result = await updateCollectionItem("c1", "i1", { note: "great read" });
    expect(result.note).toBe("great read");
  });

  it("removes a collection item", async () => {
    server.use(
      http.delete("/api/collections/:id/items/:itemId", () => new HttpResponse(null, { status: 204 })),
    );
    await expect(removeCollectionItem("c1", "i1")).resolves.toBeUndefined();
  });

  it("reorders collection items", async () => {
    server.use(
      http.post("/api/collections/:id/reorder", () => new HttpResponse(null, { status: 204 })),
    );
    await expect(reorderCollectionItems("c1", ["i1", "i2"])).resolves.toBeUndefined();
  });
});
