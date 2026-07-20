"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { EntityVersionDetailResponse } from "@/lib/api/types";

type DiffKind = "added" | "changed" | "removed";

interface DiffRow {
  key: string;
  kind: DiffKind;
  before: unknown;
  after: unknown;
}

function computeDiff(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown>,
): DiffRow[] {
  const beforeSnapshot = before ?? {};
  const keys = new Set([...Object.keys(beforeSnapshot), ...Object.keys(after)]);
  const rows: DiffRow[] = [];

  for (const key of keys) {
    const beforeValue = beforeSnapshot[key];
    const afterValue = after[key];
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
      continue;
    }
    let kind: DiffKind = "changed";
    if (!(key in beforeSnapshot)) kind = "added";
    else if (!(key in after)) kind = "removed";
    rows.push({ key, kind, before: beforeValue, after: afterValue });
  }

  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function VersionDiffViewer({
  before,
  after,
}: {
  before?: EntityVersionDetailResponse;
  after: EntityVersionDetailResponse;
}) {
  const t = useTranslations("history");
  const rows = computeDiff(before?.snapshot, after.snapshot);

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("noDiff")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div
          key={row.key}
          className="border-border flex flex-col gap-1 border-b pb-3 last:border-b-0"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">{row.key}</span>
            <Badge variant="outline">
              {t(`field${row.kind[0].toUpperCase()}${row.kind.slice(1)}`)}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p className="text-destructive line-through">{formatValue(row.before)}</p>
            <p className="text-foreground">{formatValue(row.after)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
