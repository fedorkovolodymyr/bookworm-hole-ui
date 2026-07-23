"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { useReadingTimeline } from "@/hooks/useReading";
import type { TimelineEntry } from "@/lib/api/types";

function intensity(minutes: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(1, minutes / max);
}

export function ReadingTimelineChart({ fromDate, toDate }: { fromDate: string; toDate: string }) {
  const t = useTranslations("reading.timeline");
  const { data, isPending, isError } = useReadingTimeline(fromDate, toDate);

  if (isPending) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (isError) {
    return <p className="text-destructive text-sm">{t("loadError")}</p>;
  }

  const items: TimelineEntry[] = data.items;
  const hasActivity = items.some((item) => item.total_minutes > 0);
  const maxMinutes = Math.max(...items.map((item) => item.total_minutes), 0);

  if (!hasActivity) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-muted-foreground mb-2 text-xs">{t("heatmapTitle")}</p>
        <div className="flex flex-wrap gap-1">
          {items.map((item) => (
            <div
              key={item.date}
              data-testid="timeline-day"
              title={`${item.date}: ${item.total_minutes} min`}
              className="border-border size-4 rounded-sm border"
              style={{
                backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round(
                  intensity(item.total_minutes, maxMinutes) * 100,
                )}%, transparent)`,
              }}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-xs">{t("chartTitle")}</p>
        <svg
          viewBox={`0 0 ${items.length * 12} 60`}
          className="h-16 w-full"
          role="img"
          aria-label={t("chartTitle")}
        >
          {items.map((item, index) => {
            const height = maxMinutes === 0 ? 0 : (item.total_minutes / maxMinutes) * 56;
            return (
              <rect
                key={item.date}
                x={index * 12}
                y={60 - height}
                width={8}
                height={height}
                rx={2}
                fill="var(--primary)"
              >
                <title>{`${item.date}: ${item.total_minutes} min`}</title>
              </rect>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
