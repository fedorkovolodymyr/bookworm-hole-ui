"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useUpdateSession } from "@/hooks/useReading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extractErrorMessage } from "@/lib/api/errors";
import type { ReadingSessionResponse } from "@/lib/api/types";

export function EditSessionForm({
  session,
  onSuccess,
}: {
  session: ReadingSessionResponse;
  onSuccess: () => void;
}) {
  const t = useTranslations("reading.editForm");
  const [positionStart, setPositionStart] = React.useState(
    session.position_start?.toString() ?? "",
  );
  const [positionEnd, setPositionEnd] = React.useState(session.position_end?.toString() ?? "");
  const [pagesRead, setPagesRead] = React.useState(session.pages_read?.toString() ?? "");
  const [notes, setNotes] = React.useState(session.notes ?? "");

  const updateSession = useUpdateSession();

  function handleSubmit() {
    updateSession.mutate(
      {
        sessionId: session.id,
        payload: {
          position_start: positionStart ? Number(positionStart) : null,
          position_end: positionEnd ? Number(positionEnd) : null,
          pages_read: pagesRead ? Number(pagesRead) : null,
          notes: notes || null,
        },
      },
      { onSuccess },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-position-start" className="text-sm font-medium">
          {t("positionStartLabel")}
        </label>
        <Input
          id="edit-position-start"
          type="number"
          value={positionStart}
          onChange={(e) => setPositionStart(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-position-end" className="text-sm font-medium">
          {t("positionEndLabel")}
        </label>
        <Input
          id="edit-position-end"
          type="number"
          value={positionEnd}
          onChange={(e) => setPositionEnd(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-pages-read" className="text-sm font-medium">
          {t("pagesReadLabel")}
        </label>
        <Input
          id="edit-pages-read"
          type="number"
          value={pagesRead}
          onChange={(e) => setPagesRead(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-notes" className="text-sm font-medium">
          {t("notesLabel")}
        </label>
        <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {updateSession.error && (
        <p className="text-destructive text-sm">{extractErrorMessage(updateSession.error)}</p>
      )}
      <Button disabled={updateSession.isPending} onClick={handleSubmit}>
        {updateSession.isPending ? t("submitting") : t("submit")}
      </Button>
    </div>
  );
}
