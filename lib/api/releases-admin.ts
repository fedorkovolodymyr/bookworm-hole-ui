import { apiClient } from "./client";
import type {
  AddContributorPayload,
  AddContributorResult,
  ContributorRole,
  CreateReleasePayload,
  ReleaseWithISBNsResponse,
  UpdateReleasePayload,
} from "./types";

export async function createRelease(
  payload: CreateReleasePayload,
): Promise<ReleaseWithISBNsResponse> {
  const { data } = await apiClient.post("/releases", payload);
  return data;
}

export async function updateRelease(
  releaseId: string,
  payload: UpdateReleasePayload,
): Promise<ReleaseWithISBNsResponse> {
  const { data } = await apiClient.patch(`/releases/${releaseId}`, payload);
  return data;
}

export async function addReleaseContributor(
  releaseId: string,
  payload: AddContributorPayload,
): Promise<AddContributorResult> {
  const { data } = await apiClient.post(`/releases/${releaseId}/contributors`, payload);
  return data;
}

export async function removeReleaseContributor(
  releaseId: string,
  contributorId: string,
  role: ContributorRole,
): Promise<void> {
  await apiClient.delete(`/releases/${releaseId}/contributors/${contributorId}`, {
    params: { role },
  });
}
