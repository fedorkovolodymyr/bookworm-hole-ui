"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCreateContribution, useSubmitContribution } from "@/hooks/useContributions";
import { useMe } from "@/hooks/useMe";
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
import type { ContributionKind } from "@/lib/api/types";

const DIALOG_TITLE_KEY: Record<ContributionKind, string> = {
  new_book: "newBookTitle",
  edit_book: "editBookTitle",
  edit_contributor: "editContributorTitle",
  new_release: "newBookTitle",
  edit_release: "editBookTitle",
  new_contributor: "newBookTitle",
};

export function SuggestEditDialog({
  kind,
  targetId,
  buildPayload,
}: {
  kind: ContributionKind;
  targetId?: string;
  buildPayload: () => { title?: unknown; description?: unknown } & Record<string, unknown>;
}) {
  const t = useTranslations("catalog.suggestEdit");
  const { data: me } = useMe();
  const createContribution = useCreateContribution();
  const submitContribution = useSubmitContribution();

  const [title, setTitle] = React.useState(() => String(buildPayload().title ?? ""));
  const [description, setDescription] = React.useState(() =>
    String(buildPayload().description ?? ""),
  );

  const isPending = createContribution.isPending || submitContribution.isPending;
  const isSubmitted = submitContribution.isSuccess;
  const error = createContribution.error ?? submitContribution.error;

  function handleSubmit() {
    createContribution.mutate(
      { kind, target_id: targetId ?? null, payload: { title, description } },
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
          <DialogTitle>{t(DIALOG_TITLE_KEY[kind])}</DialogTitle>
        </DialogHeader>
        {!me && <p className="text-muted-foreground text-sm">{t("signInRequired")}</p>}
        {me && !isSubmitted && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="suggest-edit-title" className="text-sm font-medium">
                {t("titleLabel")}
              </label>
              <Input
                id="suggest-edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="suggest-edit-description" className="text-sm font-medium">
                {t("descriptionLabel")}
              </label>
              <Textarea
                id="suggest-edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}
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
