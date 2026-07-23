import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import {
  startThread,
  listThreads,
  getThreadMessages,
  sendMessage,
  markThreadRead,
  ChatFriendRequiredError,
} from "./chat";

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("chat API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("startThread posts to /chat/threads (no trailing slash)", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: "t1", user_a_id: "u1", user_b_id: "u2", last_message_at: null, created_at: "x" },
    });
    const result = await startThread("u2");
    expect(apiClient.post).toHaveBeenCalledWith("/chat/threads", { recipient_id: "u2" });
    expect(result.id).toBe("t1");
  });

  it("startThread throws ChatFriendRequiredError on the business-rule 401", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      response: { status: 401, data: { detail: "You can only message your friends" } },
    });
    await expect(startThread("stranger")).rejects.toBeInstanceOf(ChatFriendRequiredError);
  });

  it("startThread rethrows other errors unchanged", async () => {
    const other = { response: { status: 500, data: { detail: "boom" } } };
    vi.mocked(apiClient.post).mockRejectedValue(other);
    await expect(startThread("u2")).rejects.toBe(other);
  });

  it("listThreads gets /chat/threads/ (trailing slash)", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    await listThreads();
    expect(apiClient.get).toHaveBeenCalledWith("/chat/threads/");
  });

  it("getThreadMessages passes before/limit as query params", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    await getThreadMessages("t1", { before: "m5", limit: 20 });
    expect(apiClient.get).toHaveBeenCalledWith("/chat/threads/t1/messages", {
      params: { before: "m5", limit: 20 },
    });
  });

  it("sendMessage posts the message body", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: "m1", thread_id: "t1", sender_id: "u1", body: "hi", attachment_book_id: null, attachment_collection_id: null, read_at: null, created_at: "x" },
    });
    await sendMessage("t1", { body: "hi" });
    expect(apiClient.post).toHaveBeenCalledWith("/chat/threads/t1/messages", { body: "hi" });
  });

  it("markThreadRead posts to the read endpoint", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: undefined });
    await markThreadRead("t1");
    expect(apiClient.post).toHaveBeenCalledWith("/chat/threads/t1/read");
  });
});
