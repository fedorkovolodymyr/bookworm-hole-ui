"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import type { BookStatusResponse } from "@/lib/api/types";

export function StatusListItem({
  status,
  onChangeStatus,
  onLend,
  onReturn,
}: {
  status: BookStatusResponse;
  onChangeStatus: () => void;
  onLend: () => void;
  onReturn: () => void;
}) {
  const t = useTranslations("statuses");
  const canLend = status.status === "owned" || status.status === "wishlist";
  const isLentOut = status.status === "lent_out";

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{status.book_id ?? status.release_id}</p>
          <StatusBadge status={status.status} />
          {status.lent_to_name && (
            <p className="text-muted-foreground text-xs">{status.lent_to_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onChangeStatus}>
            {t("changeStatus")}
          </Button>
          {canLend && (
            <Button variant="ghost" size="sm" onClick={onLend}>
              {t("lendAction")}
            </Button>
          )}
          {isLentOut && (
            <Button variant="ghost" size="sm" onClick={onReturn}>
              {t("returnAction")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
