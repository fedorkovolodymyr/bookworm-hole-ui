"use client";

import { useTranslations } from "next-intl";
import { useReturnStatus } from "@/hooks/useStatuses";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";

export function ReturnConfirmDialog({
  statusId,
  open,
  onOpenChange,
}: {
  statusId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("statuses.returnDialog");
  const returnStatus = useReturnStatus(statusId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {returnStatus.error && (
          <p className="text-destructive text-sm">{extractErrorMessage(returnStatus.error)}</p>
        )}
        <DialogFooter>
          <Button
            disabled={returnStatus.isPending}
            onClick={() => returnStatus.mutate(undefined, { onSuccess: () => onOpenChange(false) })}
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
