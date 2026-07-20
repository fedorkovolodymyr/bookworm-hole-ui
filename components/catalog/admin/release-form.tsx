"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCreateRelease, useUpdateRelease } from "@/hooks/useReleaseAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractErrorMessage } from "@/lib/api/errors";
import type { ReleaseFormat, ReleaseWithISBNsResponse } from "@/lib/api/types";

const FORMATS: ReleaseFormat[] = ["hardcover", "paperback", "ebook", "audiobook", "other"];

export function ReleaseForm({
  bookId,
  release,
  onSuccess,
}: {
  bookId?: string;
  release?: ReleaseWithISBNsResponse;
  onSuccess: (release: ReleaseWithISBNsResponse) => void;
}) {
  const t = useTranslations("catalogAdmin.release");
  const [format, setFormat] = React.useState<ReleaseFormat>(release?.format ?? "paperback");
  const [publisher, setPublisher] = React.useState(release?.publisher ?? "");
  const [publishedYear, setPublishedYear] = React.useState(
    release?.published_year?.toString() ?? "",
  );
  const [language, setLanguage] = React.useState(release?.language ?? "");
  const [pageCount, setPageCount] = React.useState(release?.page_count?.toString() ?? "");
  const [durationMinutes, setDurationMinutes] = React.useState(
    release?.duration_minutes?.toString() ?? "",
  );
  const [coverImageUrl, setCoverImageUrl] = React.useState(release?.cover_image_url ?? "");

  const createRelease = useCreateRelease();
  const updateRelease = useUpdateRelease(release?.id ?? "");
  const mutation = release ? updateRelease : createRelease;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const basePayload = {
      format,
      publisher,
      published_year: publishedYear ? Number(publishedYear) : null,
      language,
      page_count: pageCount ? Number(pageCount) : null,
      duration_minutes: durationMinutes ? Number(durationMinutes) : null,
      cover_image_url: coverImageUrl || null,
    };
    if (release) {
      updateRelease.mutate(basePayload, { onSuccess: (result) => onSuccess(result) });
    } else {
      if (!bookId) return;
      createRelease.mutate(
        { ...basePayload, book_id: bookId, description_override: null },
        { onSuccess: (result) => onSuccess(result) },
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="release-format" className="text-sm font-medium">
          {t("formatLabel")}
        </label>
        <Select value={format} onValueChange={(value) => setFormat(value as ReleaseFormat)}>
          <SelectTrigger id="release-format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMATS.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="release-publisher" className="text-sm font-medium">
          {t("publisherLabel")}
        </label>
        <Input
          id="release-publisher"
          value={publisher}
          onChange={(e) => setPublisher(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="release-published-year" className="text-sm font-medium">
          {t("publishedYearLabel")}
        </label>
        <Input
          id="release-published-year"
          type="number"
          value={publishedYear}
          onChange={(e) => setPublishedYear(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="release-language" className="text-sm font-medium">
          {t("languageLabel")}
        </label>
        <Input
          id="release-language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="release-page-count" className="text-sm font-medium">
          {t("pageCountLabel")}
        </label>
        <Input
          id="release-page-count"
          type="number"
          value={pageCount}
          onChange={(e) => setPageCount(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="release-duration-minutes" className="text-sm font-medium">
          {t("durationMinutesLabel")}
        </label>
        <Input
          id="release-duration-minutes"
          type="number"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="release-cover-image-url" className="text-sm font-medium">
          {t("coverImageUrlLabel")}
        </label>
        <Input
          id="release-cover-image-url"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
        />
      </div>
      {mutation.isError && (
        <p className="text-destructive text-sm">{extractErrorMessage(mutation.error)}</p>
      )}
      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {release
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
