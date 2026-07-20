"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReleaseWithISBNsResponse } from "@/lib/api/types";

export function ReleaseCard({ release }: { release: ReleaseWithISBNsResponse }) {
  const t = useTranslations("catalog.release");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{release.publisher}</CardTitle>
        <Badge variant="secondary">{t(`format.${release.format}`)}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        {release.published_year && <p>{release.published_year}</p>}
        <p className="text-muted-foreground">
          {release.rating_count > 0
            ? t("ratingCount", { count: release.rating_count })
            : t("noRating")}
        </p>
      </CardContent>
    </Card>
  );
}
