"use client";

import * as React from "react";
import { use } from "react";
import { useTranslations } from "next-intl";
import { useBook, useBookReviews } from "@/hooks/useBooks";
import { useMe } from "@/hooks/useMe";
import { ReleaseCard } from "@/components/catalog/release-card";
import { ReviewList } from "@/components/reviews/review-list";
import { ReviewForm } from "@/components/reviews/review-form";
import { SuggestEditDialog } from "@/components/catalog/suggest-edit-dialog";
import { AddToCollectionDialog } from "@/components/collections/add-to-collection-dialog";
import { AddToLibraryControl } from "./add-to-library-control";
import { ShareDialog } from "@/components/share/share-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ReviewResponse } from "@/lib/api/types";

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("catalog.pages");
  const reviewsT = useTranslations("reviews");
  const { data: book, isPending, isError } = useBook(id);
  const { data: reviewsPage, isLoading: reviewsLoading } = useBookReviews(id);
  const { data: me } = useMe();
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false);
  const [editingReview, setEditingReview] = React.useState<ReviewResponse | undefined>(undefined);

  if (isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (isError || !book) {
    return <p className="text-muted-foreground">{t("bookNotFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">{book.title}</h1>
          <div className="flex gap-2">
            {me && <AddToLibraryControl bookId={book.id} />}
            {me && <AddToCollectionDialog bookId={book.id} />}
            <ShareDialog kind="book" targetId={book.id} />
          </div>
        </div>
        {book.description && <p className="text-muted-foreground">{book.description}</p>}
        {me && !me.is_admin && (
          <SuggestEditDialog
            kind="edit_book"
            targetId={book.id}
            fields={[
              { key: "title", labelKey: "titleLabel", initialValue: book.title },
              {
                key: "description",
                labelKey: "descriptionLabel",
                initialValue: book.description,
                multiline: true,
              },
            ]}
          />
        )}
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("releasesTitle")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {book.releases.map((release) => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{t("reviewsTitle")}</h2>
          {me && (
            <Dialog
              open={reviewDialogOpen}
              onOpenChange={(open) => {
                setReviewDialogOpen(open);
                if (!open) setEditingReview(undefined);
              }}
            >
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                {reviewsT("writeReview")}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingReview ? reviewsT("editReview") : reviewsT("writeReview")}</DialogTitle>
                </DialogHeader>
                <ReviewForm
                  bookId={editingReview ? undefined : book.id}
                  review={editingReview}
                  onSuccess={() => {
                    setReviewDialogOpen(false);
                    setEditingReview(undefined);
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
        <ReviewList
          reviews={reviewsPage?.items ?? []}
          isLoading={reviewsLoading}
          currentUserId={me?.id}
          onEdit={(review) => {
            setEditingReview(review);
            setReviewDialogOpen(true);
          }}
        />
      </section>
    </div>
  );
}
