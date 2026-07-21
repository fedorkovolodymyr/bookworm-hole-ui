// hooks/useReviews.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createReview, deleteReview, getReview, updateReview } from "@/lib/api/reviews";
import type { CreateReviewPayload, UpdateReviewPayload } from "@/lib/api/types";

function invalidateReviewLists(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({
    predicate: (query) =>
      (query.queryKey[0] === "books" || query.queryKey[0] === "releases") &&
      query.queryKey.includes("reviews"),
  });
}

export function useReview(reviewId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", reviewId],
    queryFn: () => getReview(reviewId as string),
    enabled: Boolean(reviewId),
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReviewPayload) => createReview(payload),
    onSuccess: () => invalidateReviewLists(queryClient),
  });
}

export function useUpdateReview(reviewId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateReviewPayload) => updateReview(reviewId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", reviewId] });
      invalidateReviewLists(queryClient);
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: () => invalidateReviewLists(queryClient),
  });
}
