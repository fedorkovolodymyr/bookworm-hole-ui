"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCreateReview, useUpdateReview } from "@/hooks/useReviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { extractErrorMessage, isAxiosError } from "@/lib/api/errors";
import type { ReviewResponse } from "@/lib/api/types";

const RATINGS = [1, 2, 3, 4, 5];

function isExactlyOneOfError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
  return (
    Array.isArray(detail) &&
    detail.some((d) => typeof d?.msg === "string" && d.msg.includes("exactly one of"))
  );
}

export function ReviewForm({
  bookId,
  releaseId,
  review,
  onSuccess,
}: {
  bookId?: string;
  releaseId?: string;
  review?: ReviewResponse;
  onSuccess: () => void;
}) {
  const t = useTranslations("reviews.form");
  const isEditing = Boolean(review);
  const [rating, setRating] = React.useState<number | null>(review?.rating ?? null);
  const [title, setTitle] = React.useState(review?.title ?? "");
  const [body, setBody] = React.useState(review?.body ?? "");
  const [isPublic, setIsPublic] = React.useState(review?.is_public ?? true);
  const [containsSpoilers, setContainsSpoilers] = React.useState(review?.contains_spoilers ?? false);

  const createReview = useCreateReview();
  const updateReview = useUpdateReview(review?.id ?? "");
  const mutation = isEditing ? updateReview : createReview;

  function handleSubmit() {
    if (isEditing) {
      updateReview.mutate(
        { rating, title: title || null, body: body || null, is_public: isPublic, contains_spoilers: containsSpoilers },
        { onSuccess },
      );
      return;
    }
    createReview.mutate(
      {
        book_id: bookId ?? null,
        release_id: releaseId ?? null,
        rating,
        title: title || null,
        body: body || null,
        is_public: isPublic,
        contains_spoilers: containsSpoilers,
      },
      { onSuccess },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">{t("ratingLabel")}</legend>
        <div className="flex gap-2">
          {RATINGS.map((value) => (
            <label key={value} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
              />
              {value}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="review-title" className="text-sm font-medium">
          {t("titleLabel")}
        </label>
        <Input id="review-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="review-body" className="text-sm font-medium">
          {t("bodyLabel")}
        </label>
        <Textarea id="review-body" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked === true)} />
        {t("isPublicLabel")}
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox
          checked={containsSpoilers}
          onCheckedChange={(checked) => setContainsSpoilers(checked === true)}
        />
        {t("containsSpoilersLabel")}
      </label>
      {mutation.error && (
        <p className="text-destructive text-sm">
          {isExactlyOneOfError(mutation.error) ? t("exactlyOneRequired") : extractErrorMessage(mutation.error)}
        </p>
      )}
      <Button disabled={mutation.isPending} onClick={handleSubmit}>
        {mutation.isPending ? t("submitting") : isEditing ? t("submitEdit") : t("submitCreate")}
      </Button>
    </div>
  );
}
