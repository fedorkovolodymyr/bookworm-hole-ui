import { apiClient } from "./client";
import { isAxiosError } from "./errors";
import type {
  ChatMessageResponse,
  ChatThreadResponse,
  ChatThreadWithLastMessageResponse,
  ListMessagesParams,
  SendChatMessagePayload,
} from "./types";

const FRIEND_REQUIRED_DETAIL = "You can only message your friends";

export class ChatFriendRequiredError extends Error {
  constructor() {
    super(FRIEND_REQUIRED_DETAIL);
    this.name = "ChatFriendRequiredError";
  }
}

export async function startThread(recipientId: string): Promise<ChatThreadResponse> {
  try {
    const { data } = await apiClient.post("/chat/threads", { recipient_id: recipientId });
    return data;
  } catch (error) {
    if (
      isAxiosError(error) &&
      error.response?.status === 401 &&
      (error.response?.data as { detail?: string } | undefined)?.detail === FRIEND_REQUIRED_DETAIL
    ) {
      throw new ChatFriendRequiredError();
    }
    throw error;
  }
}

export async function listThreads(): Promise<ChatThreadWithLastMessageResponse[]> {
  const { data } = await apiClient.get("/chat/threads/");
  return data;
}

export async function getThreadMessages(
  threadId: string,
  params?: ListMessagesParams,
): Promise<ChatMessageResponse[]> {
  const { data } = await apiClient.get(`/chat/threads/${threadId}/messages`, { params });
  return data;
}

export async function sendMessage(
  threadId: string,
  payload: SendChatMessagePayload,
): Promise<ChatMessageResponse> {
  const { data } = await apiClient.post(`/chat/threads/${threadId}/messages`, payload);
  return data;
}

export async function markThreadRead(threadId: string): Promise<void> {
  await apiClient.post(`/chat/threads/${threadId}/read`);
}
