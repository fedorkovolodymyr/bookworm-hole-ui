"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useStopSession } from "@/hooks/useReading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extractErrorMessage } from "@/lib/api/errors";

export function StopSessionForm({
  releaseId,
  onSuccess,
}: {
  releaseId: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("reading.stopForm");
  const [positionEnd, setPositionEnd] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const stopSession = useStopSession();

  function handleSubmit() {
    stopSession.mutate(
      {
        release_id: releaseId,
        position_end: positionEnd ? Number(positionEnd) : null,
        notes: notes || null,
      },
      { onSuccess },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="position-end" className="text-sm font-medium">
          {t("positionEndLabel")}
        </label>
        <Input
          id="position-end"
          type="number"
          value={positionEnd}
          onChange={(e) => setPositionEnd(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="stop-notes" className="text-sm font-medium">
          {t("notesLabel")}
        </label>
        <Textarea id="stop-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {stopSession.error && (
        <p className="text-destructive text-sm">{extractErrorMessage(stopSession.error)}</p>
      )}
      <Button disabled={stopSession.isPending} onClick={handleSubmit}>
        {stopSession.isPending ? t("submitting") : t("submit")}
      </Button>
    </div>
  );
}
