import { apiClient } from "./client";
import type { BookStatusResponse, CollectionResponse, Page } from "./types";

interface FriendContentParams {
  skip?: number;
  limit?: number;
}

export async function getFriendCollections(
  userId: string,
  params: FriendContentParams = {},
): Promise<Page<CollectionResponse>> {
  const { data } = await apiClient.get(`/friends/${userId}/collections`, { params });
  return data;
}

export async function getFriendLibrary(
  userId: string,
  params: FriendContentParams = {},
): Promise<Page<BookStatusResponse>> {
  const { data } = await apiClient.get(`/friends/${userId}/library`, { params });
  return data;
}
