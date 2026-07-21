"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useShareBook, useShareCollection } from "@/hooks/useShare";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";

export function ShareDialog({ kind, targetId }: { kind: "book" | "collection"; targetId: string }) {
  const t = useTranslations("share");
  const [open, setOpen] = React.useState(false);
  const [friendId, setFriendId] = React.useState("");
  const [message, setMessage] = React.useState("");

  const shareBook = useShareBook();
  const shareCollection = useShareCollection();
  const mutation = kind === "book" ? shareBook : shareCollection;

  function handleSubmit() {
    const payload = { friend_id: friendId, message };
    const args = kind === "book" ? { bookId: targetId, payload } : { collectionId: targetId, payload };
    mutation.mutate(args as never, {
      onSuccess: () => {
        toast.success(t("success"));
        setOpen(false);
        setFriendId("");
        setMessage("");
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{t("trigger")}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="share-friend-id" className="text-sm font-medium">
              {t("friendIdLabel")}
            </label>
            <Input id="share-friend-id" value={friendId} onChange={(e) => setFriendId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="share-message" className="text-sm font-medium">
              {t("messageLabel")}
            </label>
            <Textarea id="share-message" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          {mutation.error && (
            <p className="text-destructive text-sm">{extractErrorMessage(mutation.error)}</p>
          )}
        </div>
        <DialogFooter>
          <Button disabled={!friendId || mutation.isPending} onClick={handleSubmit}>
            {mutation.isPending ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
