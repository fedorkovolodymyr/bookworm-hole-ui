"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCreateContribution, useSubmitContribution } from "@/hooks/useContributions";
import { useMe } from "@/hooks/useMe";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";
import type { ContributionKind } from "@/lib/api/types";

export function SuggestEditDialog({
  kind,
  targetId,
  buildPayload,
}: {
  kind: ContributionKind;
  targetId?: string;
  buildPayload: () => Record<string, unknown>;
}) {
  const t = useTranslations("catalog.suggestEdit");
  const { data: me } = useMe();
  const createContribution = useCreateContribution();
  const submitContribution = useSubmitContribution();

  const isPending = createContribution.isPending || submitContribution.isPending;
  const isSubmitted = submitContribution.isSuccess;
  const error = createContribution.error ?? submitContribution.error;

  function handleSubmit() {
    createContribution.mutate(
      { kind, target_id: targetId ?? null, payload: buildPayload() },
      {
        onSuccess: (contribution) => submitContribution.mutate(contribution.id),
      },
    );
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{t("trigger")}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newBookTitle")}</DialogTitle>
        </DialogHeader>
        {!me && <p className="text-muted-foreground text-sm">{t("signInRequired")}</p>}
        {isSubmitted && <p className="text-muted-foreground text-sm">{t("submitted")}</p>}
        {error && <p className="text-destructive text-sm">{extractErrorMessage(error)}</p>}
        <DialogFooter>
          <Button disabled={!me || isPending || isSubmitted} onClick={handleSubmit}>
            {isPending ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
