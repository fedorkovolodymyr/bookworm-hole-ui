// lib/api/share.test.ts
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { shareBook, shareCollection } from "./share";

describe("share api client", () => {
  it("shares a book", async () => {
    server.use(
      http.post("/api/share/book/:id", () =>
        HttpResponse.json({ id: "m1", thread_id: "t1", attachment_book_id: "b1" }),
      ),
    );
    const result = await shareBook("b1", { friend_id: "f1", message: "check this out" });
    expect(result.attachment_book_id).toBe("b1");
  });

  it("shares a collection", async () => {
    server.use(
      http.post("/api/share/collection/:id", () =>
        HttpResponse.json({ id: "m1", thread_id: "t1", attachment_collection_id: "c1" }),
      ),
    );
    const result = await shareCollection("c1", { friend_id: "f1", message: "check this out" });
    expect(result.attachment_collection_id).toBe("c1");
  });
});
