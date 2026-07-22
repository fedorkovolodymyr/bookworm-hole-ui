"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReadingSessionResponse } from "@/lib/api/types";

export function ActiveSessionCard({
  session,
  onStop,
}: {
  session: ReadingSessionResponse;
  onStop: () => void;
}) {
  const t = useTranslations("reading.activeSection");
  const startedAt = new Date(session.started_at);

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{session.release_id}</p>
          <p className="text-muted-foreground text-xs">
            {startedAt.toLocaleString()}
          </p>
        </div>
        <Button size="sm" onClick={onStop}>
          {t("stopAction")}
        </Button>
      </CardContent>
    </Card>
  );
}
