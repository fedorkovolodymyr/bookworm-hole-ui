"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCancelDeletion, useScheduleDeletion } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteAccountSection({
  deletionScheduledAt,
}: {
  deletionScheduledAt: string | null;
}) {
  const t = useTranslations("profile");
  const [open, setOpen] = React.useState(false);
  const scheduleDeletion = useScheduleDeletion();
  const cancelDeletion = useCancelDeletion();

  const scheduledAt = scheduleDeletion.data?.deletion_scheduled_at ?? deletionScheduledAt;
  const isScheduled = Boolean(scheduledAt) && !cancelDeletion.isSuccess;

  if (isScheduled) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">
          {t("scheduledDeletionNotice", {
            date: new Date(scheduledAt as string).toLocaleDateString(),
          })}
        </p>
        <Button
          variant="outline"
          className="self-start"
          disabled={cancelDeletion.isPending}
          onClick={() => cancelDeletion.mutate()}
        >
          {t("cancelDeletion")}
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>{t("deleteAccount")}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
          <DialogDescription>{t("deleteConfirmDescription")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={scheduleDeletion.isPending}
            onClick={() => {
              scheduleDeletion.mutate(undefined, { onSuccess: () => setOpen(false) });
            }}
          >
            {t("confirmDeletion")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
