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

export interface SuggestEditField {
  /** The payload key this field maps to, e.g. "title" or "full_name". */
  key: string;
  /** Message key under catalog.suggestEdit for the field's label. */
  labelKey: string;
  initialValue: string;
  /** Use a Textarea instead of an Input. */
  multiline?: boolean;
}

export function SuggestEditDialog({
  kind,
  targetId,
  fields,
}: {
  kind: ContributionKind;
  targetId?: string;
  fields: SuggestEditField[];
}) {
  const t = useTranslations("catalog.suggestEdit");
  const { data: me } = useMe();
  const createContribution = useCreateContribution();
  const submitContribution = useSubmitContribution();

  const [values, setValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.key, field.initialValue])),
  );

  const isPending = createContribution.isPending || submitContribution.isPending;
  const isSubmitted = submitContribution.isSuccess;
  const error = createContribution.error ?? submitContribution.error;

  function handleSubmit() {
    const payload = Object.fromEntries(fields.map((field) => [field.key, values[field.key]]));
    createContribution.mutate(
      { kind, target_id: targetId ?? null, payload },
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
            {fields.map((field) => {
              const inputId = `suggest-edit-${field.key}`;
              return (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <label htmlFor={inputId} className="text-sm font-medium">
                    {t(field.labelKey)}
                  </label>
                  {field.multiline ? (
                    <Textarea
                      id={inputId}
                      value={values[field.key] ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                    />
                  ) : (
                    <Input
                      id={inputId}
                      value={values[field.key] ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                    />
                  )}
                </div>
              );
            })}
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
