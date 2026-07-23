"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useActiveSessions, useSessions } from "@/hooks/useReading";
import { ActiveSessionCard } from "@/components/reading/active-session-card";
import { StartSessionForm } from "@/components/reading/start-session-form";
import { StopSessionForm } from "@/components/reading/stop-session-form";
import { SessionHistoryList } from "@/components/reading/session-history-list";
import { EditSessionForm } from "@/components/reading/edit-session-form";
import { DeleteSessionDialog } from "@/components/reading/delete-session-dialog";
import { ReadingStatsSummary } from "@/components/reading/reading-stats-summary";
import { ReadingStreakBadge } from "@/components/reading/reading-streak-badge";
import { ReadingTimelineChart } from "@/components/reading/reading-timeline-chart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReadingSessionResponse, ReadingStatsPeriod } from "@/lib/api/types";

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function ReadingPage() {
  const t = useTranslations("reading");
  const tStats = useTranslations("reading.stats");
  const [period, setPeriod] = React.useState<ReadingStatsPeriod>("month");
  const [startDialogOpen, setStartDialogOpen] = React.useState(false);
  const [stoppingSession, setStoppingSession] = React.useState<ReadingSessionResponse | null>(null);
  const [editingSession, setEditingSession] = React.useState<ReadingSessionResponse | null>(null);
  const [deletingSession, setDeletingSession] = React.useState<ReadingSessionResponse | null>(null);

  const activeSessions = useActiveSessions();
  const sessions = useSessions();

  const today = React.useMemo(() => new Date(), []);
  const rangeStart = React.useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 27);
    return toDateOnly(date);
  }, [today]);
  const rangeEnd = toDateOnly(today);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
        <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
          <DialogTrigger render={<Button />}>{t("activeSection.startAction")}</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("startForm.title")}</DialogTitle>
            </DialogHeader>
            <StartSessionForm onSuccess={() => setStartDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("activeSection.title")}</h2>
        {activeSessions.isPending && <Skeleton className="h-20 w-full" />}
        {!activeSessions.isPending && activeSessions.data?.length === 0 && (
          <p className="text-muted-foreground">{t("activeSection.empty")}</p>
        )}
        {activeSessions.data?.map((session) => (
          <ActiveSessionCard
            key={session.id}
            session={session}
            onStop={() => setStoppingSession(session)}
          />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{tStats("title")}</h2>
          <Select value={period} onValueChange={(value) => setPeriod(value as ReadingStatsPeriod)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{tStats("period.week")}</SelectItem>
              <SelectItem value="month">{tStats("period.month")}</SelectItem>
              <SelectItem value="year">{tStats("period.year")}</SelectItem>
              <SelectItem value="all">{tStats("period.all")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ReadingStatsSummary period={period} />
        <ReadingStreakBadge />
        <ReadingTimelineChart fromDate={rangeStart} toDate={rangeEnd} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("history.title")}</h2>
        {sessions.isPending && <Skeleton className="h-40 w-full" />}
        {!sessions.isPending && sessions.data && (
          <SessionHistoryList
            sessions={sessions.data}
            onEdit={setEditingSession}
            onDelete={setDeletingSession}
          />
        )}
      </section>

      <Dialog
        open={stoppingSession !== null}
        onOpenChange={(open) => !open && setStoppingSession(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stopForm.title")}</DialogTitle>
          </DialogHeader>
          {stoppingSession && (
            <StopSessionForm
              releaseId={stoppingSession.release_id}
              onSuccess={() => setStoppingSession(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingSession !== null}
        onOpenChange={(open) => !open && setEditingSession(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editForm.title")}</DialogTitle>
          </DialogHeader>
          {editingSession && (
            <EditSessionForm session={editingSession} onSuccess={() => setEditingSession(null)} />
          )}
        </DialogContent>
      </Dialog>

      {deletingSession && (
        <DeleteSessionDialog
          session={deletingSession}
          open={deletingSession !== null}
          onOpenChange={(open) => !open && setDeletingSession(null)}
        />
      )}
    </div>
  );
}
