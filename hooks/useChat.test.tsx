import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as chatApi from "@/lib/api/chat";
import {
  useThreads,
  useThreadMessages,
  useStartThread,
  useSendMessage,
  useMarkThreadRead,
} from "./useChat";

vi.mock("@/lib/api/chat");

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useChat hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useThreads fetches the thread list", async () => {
    vi.mocked(chatApi.listThreads).mockResolvedValue([
      {
        id: "t1",
        user_a_id: "u1",
        user_b_id: "u2",
        last_message_at: null,
        created_at: "x",
        last_message: null,
      },
    ]);
    const { result } = renderHook(() => useThreads(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it("useThreadMessages fetches the first page", async () => {
    vi.mocked(chatApi.getThreadMessages).mockResolvedValue([
      {
        id: "m1",
        thread_id: "t1",
        sender_id: "u1",
        body: "hi",
        attachment_book_id: null,
        attachment_collection_id: null,
        read_at: null,
        created_at: "x",
      },
    ]);
    const { result } = renderHook(() => useThreadMessages("t1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(chatApi.getThreadMessages).toHaveBeenCalledWith("t1", { before: undefined, limit: 50 });
    expect(result.current.data?.pages[0]).toHaveLength(1);
  });

  it("useStartThread calls startThread with recipientId", async () => {
    vi.mocked(chatApi.startThread).mockResolvedValue({
      id: "t1",
      user_a_id: "u1",
      user_b_id: "u2",
      last_message_at: null,
      created_at: "x",
    });
    const { result } = renderHook(() => useStartThread(), { wrapper });
    result.current.mutate("u2");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(chatApi.startThread).toHaveBeenCalledWith("u2");
  });

  it("useSendMessage calls sendMessage with the thread id and payload", async () => {
    vi.mocked(chatApi.sendMessage).mockResolvedValue({
      id: "m2",
      thread_id: "t1",
      sender_id: "u1",
      body: "hey",
      attachment_book_id: null,
      attachment_collection_id: null,
      read_at: null,
      created_at: "x",
    });
    const { result } = renderHook(() => useSendMessage("t1"), { wrapper });
    result.current.mutate({ body: "hey" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(chatApi.sendMessage).toHaveBeenCalledWith("t1", { body: "hey" });
  });

  it("useMarkThreadRead calls markThreadRead", async () => {
    vi.mocked(chatApi.markThreadRead).mockResolvedValue(undefined);
    const { result } = renderHook(() => useMarkThreadRead(), { wrapper });
    result.current.mutate("t1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(chatApi.markThreadRead).toHaveBeenCalledWith("t1");
  });
});
