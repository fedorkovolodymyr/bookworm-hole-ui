"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCreateBook, useUpdateBook } from "@/hooks/useBookAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extractErrorMessage } from "@/lib/api/errors";
import type { BookResponse } from "@/lib/api/types";

export function BookForm({
  book,
  onSuccess,
}: {
  book?: BookResponse;
  onSuccess: (book: BookResponse) => void;
}) {
  const t = useTranslations("catalogAdmin.book");
  const [title, setTitle] = React.useState(book?.title ?? "");
  const [originalTitle, setOriginalTitle] = React.useState(book?.original_title ?? "");
  const [originalLanguage, setOriginalLanguage] = React.useState(book?.original_language ?? "");
  const [firstPublicationYear, setFirstPublicationYear] = React.useState(
    book?.first_publication_year?.toString() ?? "",
  );
  const [description, setDescription] = React.useState(book?.description ?? "");

  const createBook = useCreateBook();
  const updateBook = useUpdateBook(book?.id ?? "");
  const mutation = book ? updateBook : createBook;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      title,
      original_title: originalTitle || null,
      original_language: originalLanguage || null,
      first_publication_year: firstPublicationYear ? Number(firstPublicationYear) : null,
      description,
    };
    mutation.mutate(payload, { onSuccess: (result) => onSuccess(result) });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="book-title" className="text-sm font-medium">
          {t("titleLabel")}
        </label>
        <Input id="book-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="book-original-title" className="text-sm font-medium">
          {t("originalTitleLabel")}
        </label>
        <Input
          id="book-original-title"
          value={originalTitle}
          onChange={(e) => setOriginalTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="book-original-language" className="text-sm font-medium">
          {t("originalLanguageLabel")}
        </label>
        <Input
          id="book-original-language"
          value={originalLanguage}
          onChange={(e) => setOriginalLanguage(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="book-first-publication-year" className="text-sm font-medium">
          {t("firstPublicationYearLabel")}
        </label>
        <Input
          id="book-first-publication-year"
          type="number"
          value={firstPublicationYear}
          onChange={(e) => setFirstPublicationYear(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="book-description" className="text-sm font-medium">
          {t("descriptionLabel")}
        </label>
        <Textarea
          id="book-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      {mutation.isError && (
        <p className="text-destructive text-sm">{extractErrorMessage(mutation.error)}</p>
      )}
      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {book
          ? mutation.isPending
            ? t("saving")
            : t("editSubmit")
          : mutation.isPending
            ? t("creating")
            : t("createSubmit")}
      </Button>
    </form>
  );
}
