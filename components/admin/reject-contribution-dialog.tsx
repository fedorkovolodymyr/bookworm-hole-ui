"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useRejectContribution } from "@/hooks/useAdminContributions";
import { extractErrorMessage } from "@/lib/api/errors";

export function RejectContributionDialog({
  contributionId,
  open,
  onOpenChange,
}: {
  contributionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("admin.rejectDialog");
  const [notes, setNotes] = useState("");
  const rejectContribution = useRejectContribution();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reject-notes" className="text-sm font-medium">
            {t("notesLabel")}
          </label>
          <Textarea
            id="reject-notes"
            placeholder={t("notesPlaceholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {rejectContribution.error && (
          <p className="text-destructive text-sm">
            {extractErrorMessage(rejectContribution.error)}
          </p>
        )}
        <DialogFooter>
          <Button
            disabled={notes.trim().length === 0 || rejectContribution.isPending}
            onClick={() =>
              rejectContribution.mutate(
                { contributionId, payload: { notes } },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
