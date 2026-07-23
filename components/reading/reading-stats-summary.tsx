"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReadingStats } from "@/hooks/useReading";
import type { ReadingStatsPeriod } from "@/lib/api/types";

export function ReadingStatsSummary({ period }: { period: ReadingStatsPeriod }) {
  const t = useTranslations("reading.stats");
  const { data, isPending, isError } = useReadingStats(period);

  if (isPending) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (isError) {
    return <p className="text-destructive text-sm">{t("loadError")}</p>;
  }

  const tiles = [
    { label: t("totalMinutes"), value: data.total_minutes },
    { label: t("totalSessions"), value: data.total_sessions },
    { label: t("uniqueBooks"), value: data.unique_books },
    { label: t("totalPages"), value: data.total_pages },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardContent className="flex flex-col gap-1">
            <p className="text-2xl font-semibold">{tile.value}</p>
            <p className="text-muted-foreground text-xs">{tile.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
