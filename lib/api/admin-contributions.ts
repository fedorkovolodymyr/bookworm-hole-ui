import { apiClient } from "./client";
import type {
  AdminContributionResponse,
  ContributionDiffResponse,
  ContributionStatus,
  Page,
  RejectContributionPayload,
} from "./types";

export async function fetchAdminContributions(
  params: { status?: ContributionStatus; skip?: number; limit?: number } = {},
): Promise<Page<AdminContributionResponse>> {
  const { data } = await apiClient.get("/admin/contributions/", { params });
  return data;
}

export async function claimContribution(
  contributionId: string,
): Promise<AdminContributionResponse> {
  const { data } = await apiClient.post(`/admin/contributions/${contributionId}/claim`);
  return data;
}

export async function fetchContributionDiff(
  contributionId: string,
): Promise<ContributionDiffResponse> {
  const { data } = await apiClient.get(`/admin/contributions/${contributionId}/diff`);
  return data;
}

export async function approveContribution(
  contributionId: string,
): Promise<AdminContributionResponse> {
  const { data } = await apiClient.post(`/admin/contributions/${contributionId}/approve`);
  return data;
}

export async function rejectContribution(
  contributionId: string,
  payload: RejectContributionPayload,
): Promise<AdminContributionResponse> {
  const { data } = await apiClient.post(
    `/admin/contributions/${contributionId}/reject`,
    payload,
  );
  return data;
}
