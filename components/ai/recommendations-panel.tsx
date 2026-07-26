"use client";

import { useTranslations } from "next-intl";
import { useRecommendations } from "@/hooks/useAi";
import { AiFeatureUnavailableError } from "@/lib/api/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function RecommendationsPanel() {
  const t = useTranslations("ai.recommendations");
  const tAi = useTranslations("ai");
  const recommend = useRecommendations();

  const isUnavailable = recommend.error instanceof AiFeatureUnavailableError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button
          onClick={() => recommend.mutate({ n: 10 })}
          disabled={recommend.isPending || isUnavailable}
        >
          {recommend.isPending ? t("submitting") : t("submit")}
        </Button>
        {isUnavailable && <p className="text-muted-foreground text-sm">{tAi("comingSoon")}</p>}
        {recommend.isSuccess && recommend.data.book_ids.length === 0 && (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        )}
        {recommend.isSuccess && recommend.data.book_ids.length > 0 && (
          <ul className="flex flex-col gap-1">
            {recommend.data.book_ids.map((id) => (
              <li key={id} className="text-sm">
                {id}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
