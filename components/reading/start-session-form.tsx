"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useStartSession } from "@/hooks/useReading";
import { useLibrary } from "@/hooks/useStatuses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractErrorMessage } from "@/lib/api/errors";
import type { PositionUnit } from "@/lib/api/types";

const POSITION_UNITS: PositionUnit[] = ["page", "percent", "location", "timestamp"];

export function StartSessionForm({
  releaseId,
  onSuccess,
}: {
  releaseId?: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("reading.startForm");
  const tUnit = useTranslations("reading.startForm.unit");
  const [selectedReleaseId, setSelectedReleaseId] = React.useState(releaseId ?? "");
  const [positionStart, setPositionStart] = React.useState("");
  const [positionUnit, setPositionUnit] = React.useState<PositionUnit | "">("");

  const library = useLibrary({}, { enabled: !releaseId });
  const startSession = useStartSession();
  const releaseOptions = releaseId
    ? []
    : (library.data?.items ?? []).filter(
        (item): item is typeof item & { release_id: string } => item.release_id !== null,
      );

  function handleSubmit() {
    startSession.mutate(
      {
        release_id: selectedReleaseId,
        position_start: positionStart ? Number(positionStart) : null,
        position_unit: positionUnit || null,
      },
      { onSuccess },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!releaseId && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t("releaseLabel")}</label>
          <Select value={selectedReleaseId} onValueChange={(v) => setSelectedReleaseId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder={t("releasePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {releaseOptions.map((item) => (
                <SelectItem key={item.release_id} value={item.release_id}>
                  {item.release_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="position-start" className="text-sm font-medium">
          {t("positionStartLabel")}
        </label>
        <Input
          id="position-start"
          type="number"
          value={positionStart}
          onChange={(e) => setPositionStart(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("positionUnitLabel")}</label>
        <Select value={positionUnit} onValueChange={(v) => setPositionUnit(v as PositionUnit)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POSITION_UNITS.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {tUnit(unit)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {startSession.error && (
        <p className="text-destructive text-sm">{extractErrorMessage(startSession.error)}</p>
      )}
      <Button disabled={startSession.isPending || !selectedReleaseId} onClick={handleSubmit}>
        {startSession.isPending ? t("submitting") : t("submit")}
      </Button>
    </div>
  );
}
