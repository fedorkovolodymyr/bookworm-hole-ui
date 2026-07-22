"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useLendStatus } from "@/hooks/useStatuses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";

export function LendDialog({
  statusId,
  open,
  onOpenChange,
}: {
  statusId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("statuses.lendDialog");
  const [friendUserId, setFriendUserId] = React.useState("");
  const [friendName, setFriendName] = React.useState("");
  const lendStatus = useLendStatus(statusId);

  function handleSubmit() {
    lendStatus.mutate(
      { lent_to_user_id: friendUserId || null, lent_to_name: friendName || null },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lend-friend-id" className="text-sm font-medium">
              {t("friendIdLabel")}
            </label>
            <Input
              id="lend-friend-id"
              value={friendUserId}
              onChange={(e) => setFriendUserId(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lend-friend-name" className="text-sm font-medium">
              {t("orNameLabel")}
            </label>
            <Input
              id="lend-friend-name"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
            />
          </div>
          {lendStatus.error && (
            <p className="text-destructive text-sm">{extractErrorMessage(lendStatus.error)}</p>
          )}
        </div>
        <DialogFooter>
          <Button disabled={lendStatus.isPending} onClick={handleSubmit}>
            {lendStatus.isPending ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
