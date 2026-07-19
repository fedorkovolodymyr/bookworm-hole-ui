"use client";

import * as React from "react";
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
  const [open, setOpen] = React.useState(false);
  const scheduleDeletion = useScheduleDeletion();
  const cancelDeletion = useCancelDeletion();

  const scheduledAt = scheduleDeletion.data?.deletion_scheduled_at ?? deletionScheduledAt;
  const isScheduled = Boolean(scheduledAt) && !cancelDeletion.isSuccess;

  if (isScheduled) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">
          Your account is scheduled for deletion on{" "}
          {new Date(scheduledAt as string).toLocaleDateString()}.
        </p>
        <Button
          variant="outline"
          className="self-start"
          disabled={cancelDeletion.isPending}
          onClick={() => cancelDeletion.mutate()}
        >
          Cancel deletion
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>Delete account</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            Your account will be scheduled for deletion and permanently removed after a 30-day grace
            period. You can cancel any time before then.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={scheduleDeletion.isPending}
            onClick={() => {
              scheduleDeletion.mutate(undefined, { onSuccess: () => setOpen(false) });
            }}
          >
            Confirm deletion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
