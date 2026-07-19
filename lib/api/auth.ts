// lib/api/auth.ts
import { apiClient } from "./client";
import type { LoginPayload, RegisterPayload, UserResponse } from "./types";

export async function registerUser(payload: RegisterPayload): Promise<{ user: UserResponse }> {
  const { data } = await apiClient.post("/auth/register", payload);
  return data;
}

export async function loginUser(payload: LoginPayload): Promise<{ user: UserResponse }> {
  const { data } = await apiClient.post("/auth/login", payload);
  return data;
}

export async function logoutUser(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function requestEmailVerification(): Promise<void> {
  await apiClient.post("/auth/verify/request");
}

export async function confirmEmailVerification(token: string): Promise<UserResponse> {
  const { data } = await apiClient.post("/auth/verify/confirm", { token });
  return data;
}
