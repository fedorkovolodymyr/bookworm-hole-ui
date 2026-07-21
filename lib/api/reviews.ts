import { apiClient } from "./client";
import type { CreateReviewPayload, ReviewResponse, UpdateReviewPayload } from "./types";

export async function createReview(payload: CreateReviewPayload): Promise<ReviewResponse> {
  const { data } = await apiClient.post("/reviews", payload);
  return data;
}

export async function getReview(reviewId: string): Promise<ReviewResponse> {
  const { data } = await apiClient.get(`/reviews/${reviewId}`);
  return data;
}

export async function updateReview(
  reviewId: string,
  payload: UpdateReviewPayload,
): Promise<ReviewResponse> {
  const { data } = await apiClient.patch(`/reviews/${reviewId}`, payload);
  return data;
}

export async function deleteReview(reviewId: string): Promise<void> {
  await apiClient.delete(`/reviews/${reviewId}`);
}
