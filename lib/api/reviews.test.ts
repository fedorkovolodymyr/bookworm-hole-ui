import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { createReview, deleteReview, getReview, updateReview } from "./reviews";

describe("reviews api client", () => {
  it("creates a review", async () => {
    server.use(
      http.post("/api/reviews", async ({ request }) => {
        const body = (await request.json()) as { book_id: string };
        return HttpResponse.json({ id: "r1", book_id: body.book_id, rating: 5 }, { status: 201 });
      }),
    );
    const result = await createReview({ book_id: "b1", rating: 5 });
    expect(result.id).toBe("r1");
  });

  it("gets a review", async () => {
    server.use(http.get("/api/reviews/:id", ({ params }) => HttpResponse.json({ id: params.id })));
    const result = await getReview("r1");
    expect(result.id).toBe("r1");
  });

  it("updates a review", async () => {
    server.use(http.patch("/api/reviews/:id", () => HttpResponse.json({ id: "r1", rating: 4 })));
    const result = await updateReview("r1", { rating: 4 });
    expect(result.rating).toBe(4);
  });

  it("deletes a review", async () => {
    server.use(http.delete("/api/reviews/:id", () => new HttpResponse(null, { status: 204 })));
    await expect(deleteReview("r1")).resolves.toBeUndefined();
  });

  it("surfaces the exactly-one-of validation error", async () => {
    server.use(
      http.post("/api/reviews", () =>
        HttpResponse.json(
          {
            detail: [
              { type: "value_error", loc: ["body"], msg: "Value error, exactly one of book_id or release_id is required" },
            ],
          },
          { status: 422 },
        ),
      ),
    );
    await expect(createReview({})).rejects.toMatchObject({
      response: { status: 422 },
    });
  });
});
