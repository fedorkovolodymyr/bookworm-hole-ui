"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useContributor, useContributorBooks } from "@/hooks/useContributors";
import { BookCard } from "@/components/catalog/book-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContributorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("catalog.pages");
  const { data: contributor, isPending, isError } = useContributor(id);
  const { data: booksPage, isLoading: booksLoading } = useContributorBooks(id);

  if (isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (isError || !contributor) {
    return <p className="text-muted-foreground">{t("contributorNotFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{contributor.full_name}</h1>
        {contributor.bio && <p className="text-muted-foreground">{contributor.bio}</p>}
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("booksByContributor")}</h2>
        {booksLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(booksPage?.items ?? []).map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
