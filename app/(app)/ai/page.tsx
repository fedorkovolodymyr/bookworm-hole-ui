"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { RecommendationsPanel } from "@/components/ai/recommendations-panel";
import { SummaryPanel } from "@/components/ai/summary-panel";
import { TagSuggestPanel } from "@/components/ai/tag-suggest-panel";
import { Input } from "@/components/ui/input";

export default function AiPage() {
  const t = useTranslations("ai");
  const [bookId, setBookId] = React.useState("");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
      <RecommendationsPanel />
      <SummaryPanel />
      <div className="flex flex-col gap-2">
        <label htmlFor="tag-suggest-book-id" className="text-sm font-medium">
          {t("tagSuggest.bookLabel")}
        </label>
        <Input
          id="tag-suggest-book-id"
          value={bookId}
          onChange={(event) => setBookId(event.target.value)}
        />
      </div>
      <TagSuggestPanel bookId={bookId.trim() || null} bookLabel={bookId.trim() || null} />
    </div>
  );
}
