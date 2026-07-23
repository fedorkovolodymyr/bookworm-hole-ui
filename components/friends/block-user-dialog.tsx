"use client";

import { useTranslations } from "next-intl";
import { useBlockUser } from "@/hooks/useFriends";
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

export function BlockUserDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("friends.blockDialog");
  const blockUser = useBlockUser();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {blockUser.error && (
          <p className="text-destructive text-sm">{extractErrorMessage(blockUser.error)}</p>
        )}
        <DialogFooter>
          <Button
            disabled={blockUser.isPending}
            onClick={() => blockUser.mutate(userId, { onSuccess: () => onOpenChange(false) })}
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
