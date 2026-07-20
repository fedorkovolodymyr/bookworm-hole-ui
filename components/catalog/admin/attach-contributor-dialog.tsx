"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useContributorList } from "@/hooks/useContributors";
import { useAddBookContributor } from "@/hooks/useBookAdmin";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";
import type { ContributorRole } from "@/lib/api/types";

const ROLES: ContributorRole[] = [
  "author",
  "co_author",
  "translator",
  "illustrator",
  "editor",
  "narrator",
  "foreword",
  "other",
];

export function AttachContributorDialog({
  bookId,
  onSuccess,
}: {
  bookId: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("catalogAdmin.attachContributor");
  const [contributorId, setContributorId] = React.useState("");
  const [role, setRole] = React.useState<ContributorRole>("author");
  const { data: contributorsPage } = useContributorList({ limit: 50 });
  const addContributor = useAddBookContributor(bookId);

  const alreadyExisted = addContributor.data?.status === "already_existed";

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{t("trigger")}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="attach-contributor-select" className="text-sm font-medium">
            {t("contributorLabel")}
          </label>
          <Select value={contributorId} onValueChange={(value) => setContributorId(value ?? "")}>
            <SelectTrigger id="attach-contributor-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(contributorsPage?.items ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="attach-contributor-role" className="text-sm font-medium">
            {t("roleLabel")}
          </label>
          <Select value={role} onValueChange={(value) => setRole(value as ContributorRole)}>
            <SelectTrigger id="attach-contributor-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {alreadyExisted && <p className="text-muted-foreground text-sm">{t("alreadyExisted")}</p>}
        {addContributor.isError && (
          <p className="text-destructive text-sm">{extractErrorMessage(addContributor.error)}</p>
        )}
        <DialogFooter>
          <Button
            disabled={addContributor.isPending || !contributorId}
            onClick={() =>
              addContributor.mutate(
                { contributor_id: contributorId, role },
                { onSuccess: () => onSuccess() },
              )
            }
          >
            {addContributor.isPending ? t("adding") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
