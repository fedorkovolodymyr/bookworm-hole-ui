import { apiClient } from "./client";
import type {
  EntityVersionDetailResponse,
  EntityVersionResponse,
  Page,
  ReleaseWithISBNsResponse,
  ReviewResponse,
  ReviewSort,
} from "./types";

export async function getRelease(releaseId: string): Promise<ReleaseWithISBNsResponse> {
  const { data } = await apiClient.get(`/releases/${releaseId}`);
  return data;
}

export async function getReleaseReviews(
  releaseId: string,
  params: { sort?: ReviewSort; skip?: number; limit?: number } = {},
): Promise<Page<ReviewResponse>> {
  const { data } = await apiClient.get(`/releases/${releaseId}/reviews`, { params });
  return data;
}

export async function getReleaseHistory(
  releaseId: string,
  params: { skip?: number; limit?: number } = {},
): Promise<Page<EntityVersionResponse>> {
  const { data } = await apiClient.get(`/releases/${releaseId}/history`, { params });
  return data;
}

export async function getReleaseVersion(
  releaseId: string,
  version: number,
): Promise<EntityVersionDetailResponse> {
  const { data } = await apiClient.get(`/releases/${releaseId}/history/${version}`);
  return data;
}
