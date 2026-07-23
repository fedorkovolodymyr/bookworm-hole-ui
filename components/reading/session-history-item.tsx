"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReadingSessionResponse } from "@/lib/api/types";

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "—";
  const minutes = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000);
  return `${minutes} min`;
}

export function SessionHistoryItem({
  session,
  onEdit,
  onDelete,
}: {
  session: ReadingSessionResponse;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("reading.history");

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{session.release_id}</p>
          <p className="text-muted-foreground text-xs">
            {formatDuration(session.started_at, session.ended_at)}
            {session.pages_read !== null ? ` · ${session.pages_read} pages` : ""}
          </p>
          {session.notes && <p className="text-muted-foreground text-xs">{session.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            {t("editAction")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            {t("deleteAction")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
