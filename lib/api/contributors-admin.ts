import { apiClient } from "./client";
import type {
  ContributorResponse,
  CreateContributorPayload,
  UpdateContributorPayload,
} from "./types";

export async function createContributor(
  payload: CreateContributorPayload,
): Promise<ContributorResponse> {
  const { data } = await apiClient.post("/contributors", payload);
  return data;
}

export async function updateContributor(
  contributorId: string,
  payload: UpdateContributorPayload,
): Promise<ContributorResponse> {
  const { data } = await apiClient.patch(`/contributors/${contributorId}`, payload);
  return data;
}
