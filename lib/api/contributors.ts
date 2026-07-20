import { apiClient } from "./client";
import type {
  BookResponse,
  ContributorDetailResponse,
  ContributorListParams,
  ContributorResponse,
  EntityVersionDetailResponse,
  EntityVersionResponse,
  Page,
} from "./types";

export async function listContributors(
  params: ContributorListParams = {},
): Promise<Page<ContributorResponse>> {
  const { data } = await apiClient.get("/contributors", { params });
  return data;
}

export async function getContributor(contributorId: string): Promise<ContributorDetailResponse> {
  const { data } = await apiClient.get(`/contributors/${contributorId}`);
  return data;
}

export async function getContributorBooks(
  contributorId: string,
  params: { skip?: number; limit?: number } = {},
): Promise<Page<BookResponse>> {
  const { data } = await apiClient.get(`/contributors/${contributorId}/books`, { params });
  return data;
}

export async function getContributorHistory(
  contributorId: string,
  params: { skip?: number; limit?: number } = {},
): Promise<Page<EntityVersionResponse>> {
  const { data } = await apiClient.get(`/contributors/${contributorId}/history`, { params });
  return data;
}

export async function getContributorVersion(
  contributorId: string,
  version: number,
): Promise<EntityVersionDetailResponse> {
  const { data } = await apiClient.get(`/contributors/${contributorId}/history/${version}`);
  return data;
}
