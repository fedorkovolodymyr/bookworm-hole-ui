"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import type { BookListParams } from "@/lib/api/types";

export function BookSearchFilters({
  value,
  onChange,
}: {
  value: BookListParams;
  onChange: (params: BookListParams) => void;
}) {
  const t = useTranslations("catalog.filters");

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-title" className="text-sm font-medium">
          {t("titleLabel")}
        </label>
        <Input
          id="filter-title"
          placeholder={t("titlePlaceholder")}
          value={value.title ?? ""}
          onChange={(e) => onChange({ ...value, title: e.target.value || undefined })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-author" className="text-sm font-medium">
          {t("authorLabel")}
        </label>
        <Input
          id="filter-author"
          placeholder={t("authorPlaceholder")}
          value={value.author ?? ""}
          onChange={(e) => onChange({ ...value, author: e.target.value || undefined })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-language" className="text-sm font-medium">
          {t("languageLabel")}
        </label>
        <Input
          id="filter-language"
          placeholder={t("languagePlaceholder")}
          value={value.language ?? ""}
          onChange={(e) => onChange({ ...value, language: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
