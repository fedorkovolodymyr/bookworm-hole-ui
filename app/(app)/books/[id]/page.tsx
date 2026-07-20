"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useBook, useBookReviews } from "@/hooks/useBooks";
import { useMe } from "@/hooks/useMe";
import { ReleaseCard } from "@/components/catalog/release-card";
import { ReviewList } from "@/components/catalog/review-list";
import { SuggestEditDialog } from "@/components/catalog/suggest-edit-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("catalog.pages");
  const { data: book, isPending, isError } = useBook(id);
  const { data: reviewsPage, isLoading: reviewsLoading } = useBookReviews(id);
  const { data: me } = useMe();

  if (isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (isError || !book) {
    return <p className="text-muted-foreground">{t("bookNotFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{book.title}</h1>
        {book.description && <p className="text-muted-foreground">{book.description}</p>}
        {me && !me.is_admin && (
          <SuggestEditDialog
            kind="edit_book"
            targetId={book.id}
            buildPayload={() => ({ title: book.title, description: book.description })}
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
        <h2 className="text-lg font-medium">{t("reviewsTitle")}</h2>
        <ReviewList reviews={reviewsPage?.items ?? []} isLoading={reviewsLoading} />
      </section>
    </div>
  );
}
