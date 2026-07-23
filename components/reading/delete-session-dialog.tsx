"use client";

import { useTranslations } from "next-intl";
import { useDeleteSession } from "@/hooks/useReading";
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
import type { ReadingSessionResponse } from "@/lib/api/types";

export function DeleteSessionDialog({
  session,
  open,
  onOpenChange,
}: {
  session: ReadingSessionResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("reading.history");
  const deleteSession = useDeleteSession();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
          <DialogDescription>{t("deleteConfirmDescription")}</DialogDescription>
        </DialogHeader>
        {deleteSession.error && (
          <p className="text-destructive text-sm">{extractErrorMessage(deleteSession.error)}</p>
        )}
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={deleteSession.isPending}
            onClick={() =>
              deleteSession.mutate(session.id, { onSuccess: () => onOpenChange(false) })
            }
          >
            {t("confirmDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
