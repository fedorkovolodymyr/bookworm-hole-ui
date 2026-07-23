import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  acceptFriendRequest,
  blockUser,
  declineFriendRequest,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  removeFriend,
  sendFriendRequest,
  unblockUser,
} from "./friends";

describe("friends API client", () => {
  it("listFriends fetches /friends/", async () => {
    server.use(
      http.get("/api/friends/", () => HttpResponse.json([{ user_id: "u1", username: "bob" }])),
    );
    const result = await listFriends();
    expect(result[0].username).toBe("bob");
  });

  it("sendFriendRequest posts to /friends/requests", async () => {
    server.use(
      http.post("/api/friends/requests", () =>
        HttpResponse.json(
          {
            id: "f1",
            requester_id: "u1",
            addressee_id: "u2",
            status: "pending",
            created_at: "now",
            responded_at: null,
          },
          { status: 201 },
        ),
      ),
    );
    const result = await sendFriendRequest({ username: "bob" });
    expect(result.id).toBe("f1");
  });

  it("listIncomingRequests fetches /friends/requests/incoming", async () => {
    server.use(
      http.get("/api/friends/requests/incoming", () =>
        HttpResponse.json([{ id: "f1", status: "pending" }]),
      ),
    );
    const result = await listIncomingRequests();
    expect(result[0].id).toBe("f1");
  });

  it("listOutgoingRequests fetches /friends/requests/outgoing", async () => {
    server.use(
      http.get("/api/friends/requests/outgoing", () =>
        HttpResponse.json([{ id: "f2", status: "pending" }]),
      ),
    );
    const result = await listOutgoingRequests();
    expect(result[0].id).toBe("f2");
  });

  it("acceptFriendRequest posts to /friends/requests/:id/accept", async () => {
    server.use(
      http.post("/api/friends/requests/f1/accept", () =>
        HttpResponse.json({ id: "f1", status: "accepted" }),
      ),
    );
    const result = await acceptFriendRequest("f1");
    expect(result.status).toBe("accepted");
  });

  it("declineFriendRequest posts to /friends/requests/:id/decline", async () => {
    server.use(
      http.post("/api/friends/requests/f1/decline", () =>
        HttpResponse.json({ id: "f1", status: "declined" }),
      ),
    );
    const result = await declineFriendRequest("f1");
    expect(result.status).toBe("declined");
  });

  it("removeFriend deletes /friends/:userId", async () => {
    server.use(http.delete("/api/friends/u2", () => new HttpResponse(null, { status: 204 })));
    await expect(removeFriend("u2")).resolves.toBeUndefined();
  });

  it("blockUser posts to /friends/:userId/block", async () => {
    server.use(
      http.post("/api/friends/u2/block", () =>
        HttpResponse.json({ id: "f3", status: "blocked" }, { status: 201 }),
      ),
    );
    const result = await blockUser("u2");
    expect(result.status).toBe("blocked");
  });

  it("unblockUser deletes /friends/:userId/block", async () => {
    server.use(http.delete("/api/friends/u2/block", () => new HttpResponse(null, { status: 204 })));
    await expect(unblockUser("u2")).resolves.toBeUndefined();
  });
});
