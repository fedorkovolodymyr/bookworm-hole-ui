"use client";

import { useTranslations } from "next-intl";
import { useRemoveFriend } from "@/hooks/useFriends";
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

export function UnfriendDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("friends.unfriendDialog");
  const removeFriend = useRemoveFriend();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {removeFriend.error && (
          <p className="text-destructive text-sm">{extractErrorMessage(removeFriend.error)}</p>
        )}
        <DialogFooter>
          <Button
            disabled={removeFriend.isPending}
            onClick={() => removeFriend.mutate(userId, { onSuccess: () => onOpenChange(false) })}
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
