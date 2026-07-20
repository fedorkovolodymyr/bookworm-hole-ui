"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BookResponse } from "@/lib/api/types";

export function BookCard({ book }: { book: BookResponse }) {
  const t = useTranslations("catalog.book");

  return (
    <Link href={`/books/${book.id}`}>
      <Card className="hover:border-foreground/30 h-full transition-colors">
        <CardHeader>
          <CardTitle className="line-clamp-2">{book.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-muted-foreground line-clamp-3 text-sm">
            {book.description || t("noDescription")}
          </p>
          {book.first_publication_year && (
            <p className="text-muted-foreground text-xs">
              {t("publishedYear", { year: book.first_publication_year })}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
