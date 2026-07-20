// lib/api/contributions.ts
import { apiClient } from "./client";
import type {
  ContributionResponse,
  CreateContributionPayload,
  Page,
  UpdateContributionPayload,
} from "./types";

export async function createContribution(
  payload: CreateContributionPayload,
): Promise<ContributionResponse> {
  const { data } = await apiClient.post("/contributions", payload);
  return data;
}

export async function listOwnContributions(
  params: { skip?: number; limit?: number } = {},
): Promise<Page<ContributionResponse>> {
  const { data } = await apiClient.get("/contributions/me/contributions", { params });
  return data;
}

export async function getContribution(contributionId: string): Promise<ContributionResponse> {
  const { data } = await apiClient.get(`/contributions/${contributionId}`);
  return data;
}

export async function updateContribution(
  contributionId: string,
  payload: UpdateContributionPayload,
): Promise<ContributionResponse> {
  const { data } = await apiClient.patch(`/contributions/${contributionId}`, payload);
  return data;
}

export async function submitContribution(contributionId: string): Promise<ContributionResponse> {
  const { data } = await apiClient.post(`/contributions/${contributionId}/submit`);
  return data;
}

export async function deleteContribution(contributionId: string): Promise<void> {
  await apiClient.delete(`/contributions/${contributionId}`);
}
