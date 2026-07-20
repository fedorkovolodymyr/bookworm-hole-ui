"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReviewResponse } from "@/lib/api/types";

export function ReviewList({
  reviews,
  isLoading,
}: {
  reviews: ReviewResponse[];
  isLoading: boolean;
}) {
  const t = useTranslations("catalog.reviews");

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
        <div
          key={review.id}
          className="border-border flex flex-col gap-1 border-b pb-4 last:border-b-0"
        >
          <div className="flex items-center gap-2">
            {review.title && <p className="font-medium">{review.title}</p>}
            {review.contains_spoilers && <Badge variant="outline">{t("spoilerWarning")}</Badge>}
          </div>
          {review.body && <p className="text-muted-foreground text-sm">{review.body}</p>}
        </div>
      ))}
    </div>
  );
}
