"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { BookStatusKind } from "@/lib/api/types";

export function StatusBadge({ status }: { status: BookStatusKind }) {
  const t = useTranslations("statuses.kind");
  return <Badge variant="secondary">{t(status)}</Badge>;
}
