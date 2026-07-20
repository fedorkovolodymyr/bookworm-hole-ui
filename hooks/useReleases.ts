// hooks/useReleases.ts
import { useQuery } from "@tanstack/react-query";
import { getRelease, getReleaseHistory, getReleaseReviews, getReleaseVersion } from "@/lib/api/releases";
import type { ReviewSort } from "@/lib/api/types";

export function useRelease(releaseId: string | undefined) {
  return useQuery({
    queryKey: ["releases", releaseId],
    queryFn: () => getRelease(releaseId as string),
    enabled: Boolean(releaseId),
  });
}

export function useReleaseReviews(
  releaseId: string | undefined,
  params: { sort?: ReviewSort; skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["releases", releaseId, "reviews", params],
    queryFn: () => getReleaseReviews(releaseId as string, params),
    enabled: Boolean(releaseId),
  });
}

export function useReleaseHistory(
  releaseId: string | undefined,
  params: { skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["releases", releaseId, "history", params],
    queryFn: () => getReleaseHistory(releaseId as string, params),
    enabled: Boolean(releaseId),
  });
}

export function useReleaseVersion(releaseId: string | undefined, version: number | undefined) {
  return useQuery({
    queryKey: ["releases", releaseId, "history", version],
    queryFn: () => getReleaseVersion(releaseId as string, version as number),
    enabled: Boolean(releaseId) && version !== undefined,
  });
}
