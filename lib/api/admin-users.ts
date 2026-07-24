import { apiClient } from "./client";
import type {
  AdminUserListParams,
  AdminUserResponse,
  Page,
  PasswordResetTokenResponse,
} from "./types";

export async function fetchAdminUsers(
  params: AdminUserListParams = {},
): Promise<Page<AdminUserResponse>> {
  const { data } = await apiClient.get("/admin/users/", { params });
  return data;
}

export async function activateUser(userId: string): Promise<AdminUserResponse> {
  const { data } = await apiClient.post(`/admin/users/${userId}/activate`);
  return data;
}

export async function deactivateUser(userId: string): Promise<AdminUserResponse> {
  const { data } = await apiClient.post(`/admin/users/${userId}/deactivate`);
  return data;
}

export async function promoteUser(userId: string): Promise<AdminUserResponse> {
  const { data } = await apiClient.post(`/admin/users/${userId}/promote`);
  return data;
}

export async function demoteUser(userId: string): Promise<AdminUserResponse> {
  const { data } = await apiClient.post(`/admin/users/${userId}/demote`);
  return data;
}

export async function resetUserPassword(userId: string): Promise<PasswordResetTokenResponse> {
  const { data } = await apiClient.post(`/admin/users/${userId}/password-reset`);
  return data;
}
