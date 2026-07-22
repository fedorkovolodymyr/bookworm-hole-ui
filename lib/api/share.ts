import { apiClient } from "./client";
import type { ChatMessageResponse, SharePayload } from "./types";

export async function shareBook(
  bookId: string,
  payload: SharePayload,
): Promise<ChatMessageResponse> {
  const { data } = await apiClient.post(`/share/book/${bookId}`, payload);
  return data;
}

export async function shareCollection(
  collectionId: string,
  payload: SharePayload,
): Promise<ChatMessageResponse> {
  const { data } = await apiClient.post(`/share/collection/${collectionId}`, payload);
  return data;
}
