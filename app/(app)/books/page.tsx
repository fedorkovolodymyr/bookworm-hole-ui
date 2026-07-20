"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useBookList } from "@/hooks/useBooks";
import { BookCard } from "@/components/catalog/book-card";
import { BookSearchFilters } from "@/components/catalog/book-search-filters";
import { Skeleton } from "@/components/ui/skeleton";
import type { BookListParams } from "@/lib/api/types";

export default function BooksPage() {
  const t = useTranslations("catalog.pages");
  const [filters, setFilters] = React.useState<BookListParams>({});
  const { data, isPending, isError } = useBookList(filters);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("browseTitle")}</h1>
      <BookSearchFilters value={filters} onChange={setFilters} />
      {isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}
      {isError && <p className="text-destructive text-sm">{t("noBooksFound")}</p>}
      {data && data.items.length === 0 && (
        <p className="text-muted-foreground text-sm">{t("noBooksFound")}</p>
      )}
      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
