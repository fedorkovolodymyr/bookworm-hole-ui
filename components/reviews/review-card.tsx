"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarIcon } from "lucide-react";
import { useDeleteReview } from "@/hooks/useReviews";
import type { ReviewResponse } from "@/lib/api/types";

export function ReviewCard({
  review,
  currentUserId,
  onEdit,
}: {
  review: ReviewResponse;
  currentUserId?: string;
  onEdit: () => void;
}) {
  const t = useTranslations("reviews");
  const deleteReview = useDeleteReview();
  const isOwnReview = currentUserId !== undefined && review.user_id === currentUserId;

  return (
    <div className="border-border flex flex-col gap-1 border-b pb-4 last:border-b-0">
      <div className="flex items-center gap-2">
        {review.rating !== null && (
          <span className="flex items-center gap-0.5 text-sm">
            <StarIcon className="size-3.5 fill-current" />
            {review.rating}
          </span>
        )}
        {review.title && <p className="font-medium">{review.title}</p>}
        {review.contains_spoilers && <Badge variant="outline">{t("spoilerWarning")}</Badge>}
      </div>
      {review.body && <p className="text-muted-foreground text-sm">{review.body}</p>}
      {isOwnReview && (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            {t("editReview")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteReview.mutate(review.id)}
            disabled={deleteReview.isPending}
          >
            {t("deleteReview")}
          </Button>
        </div>
      )}
    </div>
  );
}
