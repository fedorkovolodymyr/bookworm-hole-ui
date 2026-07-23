"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReadingStreak } from "@/hooks/useReading";

export function ReadingStreakBadge() {
  const t = useTranslations("reading.streak");
  const { data, isPending, isError } = useReadingStreak();

  if (isPending) {
    return <Skeleton className="h-16 w-full" />;
  }

  if (isError) {
    return <p className="text-destructive text-sm">{t("loadError")}</p>;
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs">{t("current")}</p>
          <p className="text-lg font-semibold">{t("days", { count: data.current_streak_days })}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs">{t("longest")}</p>
          <p className="text-lg font-semibold">{t("days", { count: data.longest_streak_days })}</p>
        </div>
      </CardContent>
    </Card>
  );
}
