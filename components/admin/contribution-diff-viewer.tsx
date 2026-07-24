"use client";

import { useTranslations } from "next-intl";
import type { ContributionDiffResponse } from "@/lib/api/types";

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function diffKeys(
  proposed: Record<string, unknown>,
  current: Record<string, unknown> | null,
): string[] {
  const keys = new Set([...Object.keys(current ?? {}), ...Object.keys(proposed)]);
  return [...keys].sort((a, b) => a.localeCompare(b));
}

export function ContributionDiffViewer({ diff }: { diff: ContributionDiffResponse }) {
  const t = useTranslations("admin.diffViewer");

  return (
    <div className="flex flex-col gap-3">
      {diff.current === null && <p className="text-muted-foreground text-sm">{t("noCurrent")}</p>}
      {diffKeys(diff.proposed, diff.current).map((key) => (
        <div key={key} className="border-border flex flex-col gap-1 border-b pb-3 last:border-b-0">
          <span className="font-mono text-sm font-medium">{key}</span>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p className="text-destructive line-through">{formatValue(diff.current?.[key])}</p>
            <p className="text-foreground">{formatValue(diff.proposed[key])}</p>
          </div>
        </div>
      ))}
      {diff.warnings.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t("warningsTitle")}</span>
          <ul className="text-destructive list-inside list-disc text-sm">
            {diff.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
