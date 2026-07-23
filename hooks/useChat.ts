import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getThreadMessages,
  markThreadRead,
  sendMessage,
  startThread,
  listThreads,
} from "@/lib/api/chat";
import type { ChatMessageResponse, SendChatMessagePayload } from "@/lib/api/types";

const POLL_INTERVAL_MS = 20000;

export function useThreads() {
  return useQuery({
    queryKey: ["chat", "threads"],
    queryFn: listThreads,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useThreadMessages(threadId: string) {
  return useInfiniteQuery({
    queryKey: ["chat", "threads", threadId, "messages"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      getThreadMessages(threadId, { before: pageParam, limit: 50 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ChatMessageResponse[]) =>
      lastPage.length > 0 ? lastPage[lastPage.length - 1].id : undefined,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useStartThread() {
  return useMutation({
    mutationFn: (recipientId: string) => startThread(recipientId),
  });
}

export function useSendMessage(threadId: string) {
  const queryClient = useQueryClient();
  const messagesKey = ["chat", "threads", threadId, "messages"];

  return useMutation({
    mutationFn: (payload: SendChatMessagePayload) => sendMessage(threadId, payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const previous = queryClient.getQueryData(messagesKey);
      const tempId = crypto.randomUUID();
      const optimisticMessage: ChatMessageResponse = {
        id: tempId,
        thread_id: threadId,
        sender_id: "",
        body: payload.body,
        attachment_book_id: payload.attachment_book_id ?? null,
        attachment_collection_id: payload.attachment_collection_id ?? null,
        read_at: null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData(
        messagesKey,
        (
          data: { pages: ChatMessageResponse[][]; pageParams: (string | undefined)[] } | undefined,
        ) => {
          if (!data) return data;
          const [firstPage, ...rest] = data.pages;
          return { ...data, pages: [[optimisticMessage, ...firstPage], ...rest] };
        },
      );
      return { previous, tempId };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(messagesKey, context.previous);
      }
    },
    onSuccess: (message, _payload, context) => {
      queryClient.setQueryData(
        messagesKey,
        (
          data: { pages: ChatMessageResponse[][]; pageParams: (string | undefined)[] } | undefined,
        ) => {
          if (!data) return data;
          const [firstPage, ...rest] = data.pages;
          return {
            ...data,
            pages: [firstPage.map((m) => (m.id === context?.tempId ? message : m)), ...rest],
          };
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "threads"] });
    },
  });
}

export function useMarkThreadRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => markThreadRead(threadId),
    onSuccess: (_data, threadId) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "threads"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "threads", threadId, "messages"] });
    },
  });
}
