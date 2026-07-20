"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMergeBooks } from "@/hooks/useBookAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";

export function MergeBooksDialog({
  sourceBookId,
  sourceBookTitle,
  onSuccess,
}: {
  sourceBookId: string;
  sourceBookTitle: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("catalogAdmin.merge");
  const [targetId, setTargetId] = React.useState("");
  const mergeBooks = useMergeBooks();

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{t("trigger")}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title", { title: sourceBookTitle })}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="merge-target-id" className="text-sm font-medium">
            {t("targetIdLabel")}
          </label>
          <Input id="merge-target-id" value={targetId} onChange={(e) => setTargetId(e.target.value)} />
        </div>
        {mergeBooks.isError && (
          <p className="text-destructive text-sm">{extractErrorMessage(mergeBooks.error)}</p>
        )}
        <DialogFooter>
          <Button
            disabled={mergeBooks.isPending || !targetId}
            onClick={() =>
              mergeBooks.mutate(
                { sourceId: sourceBookId, targetId },
                { onSuccess: () => onSuccess() },
              )
            }
          >
            {mergeBooks.isPending ? t("merging") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
