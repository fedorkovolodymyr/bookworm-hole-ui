"use client";

import { useTranslations } from "next-intl";
import { useTagSuggestions } from "@/hooks/useAi";
import { AiFeatureUnavailableError } from "@/lib/api/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface TagSuggestPanelProps {
  bookId: string | null;
  bookLabel: string | null;
}

export function TagSuggestPanel({ bookId, bookLabel }: TagSuggestPanelProps) {
  const t = useTranslations("ai.tagSuggest");
  const tAi = useTranslations("ai");
  const tagSuggest = useTagSuggestions();

  const isUnavailable = tagSuggest.error instanceof AiFeatureUnavailableError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">{bookLabel ?? t("bookLabel")}</p>
        <Button
          onClick={() => bookId && tagSuggest.mutate({ book_id: bookId })}
          disabled={!bookId || tagSuggest.isPending || isUnavailable}
        >
          {tagSuggest.isPending ? t("submitting") : t("submit")}
        </Button>
        {isUnavailable && <p className="text-muted-foreground text-sm">{tAi("comingSoon")}</p>}
        {tagSuggest.isSuccess && tagSuggest.data.tags.length === 0 && (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        )}
        {tagSuggest.isSuccess && tagSuggest.data.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tagSuggest.data.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
