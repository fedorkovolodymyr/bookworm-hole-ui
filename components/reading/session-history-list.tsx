"use client";

import { useTranslations } from "next-intl";
import { SessionHistoryItem } from "./session-history-item";
import type { ReadingSessionResponse } from "@/lib/api/types";

export function SessionHistoryList({
  sessions,
  onEdit,
  onDelete,
}: {
  sessions: ReadingSessionResponse[];
  onEdit: (session: ReadingSessionResponse) => void;
  onDelete: (session: ReadingSessionResponse) => void;
}) {
  const t = useTranslations("reading.history");

  if (sessions.length === 0) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {sessions.map((session) => (
        <SessionHistoryItem
          key={session.id}
          session={session}
          onEdit={() => onEdit(session)}
          onDelete={() => onDelete(session)}
        />
      ))}
    </div>
  );
}
