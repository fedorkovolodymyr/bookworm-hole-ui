import { apiClient } from "./client";
import type { FriendRequestResponse, FriendResponse, SendFriendRequestPayload } from "./types";

export async function listFriends(): Promise<FriendResponse[]> {
  const { data } = await apiClient.get("/friends/");
  return data;
}

export async function sendFriendRequest(
  payload: SendFriendRequestPayload,
): Promise<FriendRequestResponse> {
  const { data } = await apiClient.post("/friends/requests", payload);
  return data;
}

export async function listIncomingRequests(): Promise<FriendRequestResponse[]> {
  const { data } = await apiClient.get("/friends/requests/incoming");
  return data;
}

export async function listOutgoingRequests(): Promise<FriendRequestResponse[]> {
  const { data } = await apiClient.get("/friends/requests/outgoing");
  return data;
}

export async function acceptFriendRequest(friendshipId: string): Promise<FriendRequestResponse> {
  const { data } = await apiClient.post(`/friends/requests/${friendshipId}/accept`);
  return data;
}

export async function declineFriendRequest(friendshipId: string): Promise<FriendRequestResponse> {
  const { data } = await apiClient.post(`/friends/requests/${friendshipId}/decline`);
  return data;
}

export async function removeFriend(userId: string): Promise<void> {
  await apiClient.delete(`/friends/${userId}`);
}

export async function blockUser(userId: string): Promise<FriendRequestResponse> {
  const { data } = await apiClient.post(`/friends/${userId}/block`);
  return data;
}

export async function unblockUser(userId: string): Promise<void> {
  await apiClient.delete(`/friends/${userId}/block`);
}
