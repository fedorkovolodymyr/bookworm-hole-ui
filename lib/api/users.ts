// lib/api/users.ts
import { apiClient } from "./client";
import type {
  ChangePasswordPayload,
  UpdateProfilePayload,
  UserProfileResponse,
  PublicUserProfileResponse,
  Page,
  ReviewResponse,
  ReviewSort,
} from "./types";

export async function fetchProfile(): Promise<UserProfileResponse> {
  const { data } = await apiClient.get("/users/me");
  return data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<UserProfileResponse> {
  const { data } = await apiClient.patch("/users/me", payload);
  return data;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await apiClient.post("/users/me/password", payload);
}

export async function deactivateAccount(): Promise<UserProfileResponse> {
  const { data } = await apiClient.post("/users/me/deactivate");
  return data;
}

export async function scheduleDeletion(): Promise<UserProfileResponse> {
  const { data } = await apiClient.post("/users/me/delete");
  return data;
}

export async function cancelDeletion(): Promise<UserProfileResponse> {
  const { data } = await apiClient.post("/users/me/delete/cancel");
  return data;
}

export async function getPublicProfile(
  username: string,
  params: { skip?: number; limit?: number } = {},
): Promise<PublicUserProfileResponse> {
  const { data } = await apiClient.get(`/users/${username}`, { params });
  return data;
}

export async function getUserReviews(
  userId: string,
  params: { sort?: ReviewSort; skip?: number; limit?: number } = {},
): Promise<Page<ReviewResponse>> {
  const { data } = await apiClient.get(`/users/${userId}/reviews`, { params });
  return data;
}
