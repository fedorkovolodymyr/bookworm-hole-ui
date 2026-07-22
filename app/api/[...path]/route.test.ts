import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const request_ = vi.fn();

afterEach(() => {
  request_.mockReset();
});

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({ request: request_ }),
}));

function makeParams(path: string[]) {
  return { params: Promise.resolve({ path }) };
}

describe("GET /api/[...path]", () => {
  it("forwards the path and query string, returning the upstream body", async () => {
    request_.mockResolvedValueOnce({ data: { items: [{ id: "b1" }] }, status: 200 });
    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/books?title=Dune");
    const response = await GET(req, makeParams(["books"]));
    expect(request_).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/books?title=Dune", method: "GET" }),
    );
    const body = await response.json();
    expect(body.items[0].id).toBe("b1");
  });

  it("forwards nested paths", async () => {
    request_.mockResolvedValueOnce({ data: { id: "c1" }, status: 200 });
    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/collections/c1/items");
    await GET(req, makeParams(["collections", "c1", "items"]));
    expect(request_).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/collections/c1/items", method: "GET" }),
    );
  });

  it("translates an upstream failure into a JSON error instead of throwing", async () => {
    request_.mockRejectedValueOnce({ response: { status: 404, data: { detail: "Not found" } } });
    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/books/missing");
    const response = await GET(req, makeParams(["books", "missing"]));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.detail).toBe("Not found");
  });
});

describe("POST /api/[...path]", () => {
  it("returns 403 without a matching CSRF header", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/collections", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc" },
      body: JSON.stringify({ name: "Favorites" }),
    });
    const response = await POST(req, makeParams(["collections"]));
    expect(response.status).toBe(403);
    expect(request_).not.toHaveBeenCalled();
  });

  it("forwards the body with a matching CSRF header", async () => {
    request_.mockResolvedValueOnce({ data: { id: "c1", name: "Favorites" }, status: 201 });
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/collections", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc", "x-csrf-token": "abc" },
      body: JSON.stringify({ name: "Favorites" }),
    });
    const response = await POST(req, makeParams(["collections"]));
    expect(request_).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/collections",
        method: "POST",
        data: { name: "Favorites" },
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe("c1");
  });
});

describe("DELETE /api/[...path]", () => {
  it("returns a bodyless 204 response", async () => {
    request_.mockResolvedValueOnce({ data: "", status: 204 });
    const { DELETE } = await import("./route");
    const req = new NextRequest("http://localhost/api/collections/c1", {
      method: "DELETE",
      headers: { cookie: "access_token=at; csrf_token=abc", "x-csrf-token": "abc" },
    });
    const response = await DELETE(req, makeParams(["collections", "c1"]));
    expect(response.status).toBe(204);
  });
});
