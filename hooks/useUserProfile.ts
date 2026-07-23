import { useQuery } from "@tanstack/react-query";
import { getPublicProfile, getUserReviews } from "@/lib/api/users";
import type { ReviewSort } from "@/lib/api/types";

export function usePublicProfile(username: string | undefined) {
  return useQuery({
    queryKey: ["users", "profile", username],
    queryFn: () => getPublicProfile(username as string),
    enabled: Boolean(username),
  });
}

export function useUserReviews(
  userId: string | undefined,
  params: { sort?: ReviewSort; skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["users", userId, "reviews", params],
    queryFn: () => getUserReviews(userId as string, params),
    enabled: Boolean(userId),
  });
}
