"use client";

import { useEffect } from "react";
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
import { useResetUserPassword } from "@/hooks/useAdminUsers";

export function PasswordResetDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("admin.passwordResetDialog");
  const resetPassword = useResetUserPassword();

  useEffect(() => {
    if (open && userId) {
      resetPassword.mutate(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-trigger when the dialog opens for a (possibly new) userId
  }, [open, userId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {resetPassword.isPending && <p className="text-sm">...</p>}
        {resetPassword.data && (
          <div className="bg-muted rounded-md p-3">
            <p className="font-mono text-sm break-all">{resetPassword.data.reset_token}</p>
          </div>
        )}
        <DialogFooter>
          {resetPassword.data && (
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(resetPassword.data!.reset_token)}
            >
              {t("copy")}
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>{t("close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
