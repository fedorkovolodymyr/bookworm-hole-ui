// hooks/useContributors.ts
import { useQuery } from "@tanstack/react-query";
import {
  getContributor,
  getContributorBooks,
  getContributorHistory,
  getContributorVersion,
  listContributors,
} from "@/lib/api/contributors";
import type { ContributorListParams } from "@/lib/api/types";

export function useContributorList(params: ContributorListParams = {}) {
  return useQuery({
    queryKey: ["contributors", params],
    queryFn: () => listContributors(params),
  });
}

export function useContributor(contributorId: string | undefined) {
  return useQuery({
    queryKey: ["contributors", contributorId],
    queryFn: () => getContributor(contributorId as string),
    enabled: Boolean(contributorId),
  });
}

export function useContributorBooks(
  contributorId: string | undefined,
  params: { skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["contributors", contributorId, "books", params],
    queryFn: () => getContributorBooks(contributorId as string, params),
    enabled: Boolean(contributorId),
  });
}

export function useContributorHistory(
  contributorId: string | undefined,
  params: { skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["contributors", contributorId, "history", params],
    queryFn: () => getContributorHistory(contributorId as string, params),
    enabled: Boolean(contributorId),
  });
}

export function useContributorVersion(contributorId: string | undefined, version: number | undefined) {
  return useQuery({
    queryKey: ["contributors", contributorId, "history", version],
    queryFn: () => getContributorVersion(contributorId as string, version as number),
    enabled: Boolean(contributorId) && version !== undefined,
  });
}
