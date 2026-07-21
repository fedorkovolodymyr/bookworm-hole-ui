"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewCard } from "./review-card";
import type { ReviewResponse } from "@/lib/api/types";

export function ReviewList({
  reviews,
  isLoading,
  currentUserId,
  onEdit,
}: {
  reviews: ReviewResponse[];
  isLoading: boolean;
  currentUserId?: string;
  onEdit: (review: ReviewResponse) => void;
}) {
  const t = useTranslations("reviews");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-label={t("loading")}>
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          currentUserId={currentUserId}
          onEdit={() => onEdit(review)}
        />
      ))}
    </div>
  );
}
