"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ContributionReviewList } from "@/components/admin/contribution-review-list";
import { ContributionDiffViewer } from "@/components/admin/contribution-diff-viewer";
import { RejectContributionDialog } from "@/components/admin/reject-contribution-dialog";
import {
  useAdminContributions,
  useApproveContribution,
  useContributionDiff,
} from "@/hooks/useAdminContributions";
import type { ContributionStatus } from "@/lib/api/types";

const STATUSES: ContributionStatus[] = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "merged",
];

export default function AdminContributionsPage() {
  const t = useTranslations("admin.contributions");
  const [status, setStatus] = useState<ContributionStatus>("submitted");
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [rejectingId, setRejectingId] = useState<string | undefined>();

  const { data, isPending } = useAdminContributions({ status, limit: 20 });
  const diff = useContributionDiff(selectedId);
  const approve = useApproveContribution();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("pageTitle")}</h1>
      <div className="flex flex-col gap-1.5 sm:w-64">
        <label htmlFor="status-filter" className="text-sm font-medium">
          {t("statusFilterLabel")}
        </label>
        <Select value={status} onValueChange={(next) => setStatus(next as ContributionStatus)}>
          <SelectTrigger id="status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isPending && <Skeleton className="h-40 w-full" />}
      {!isPending && (
        <ContributionReviewList contributions={data?.items ?? []} onSelect={setSelectedId} />
      )}

      <Dialog
        open={selectedId !== undefined}
        onOpenChange={(open) => !open && setSelectedId(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("viewDiff")}</DialogTitle>
          </DialogHeader>
          {diff.data && <ContributionDiffViewer diff={diff.data} />}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectingId(selectedId);
                setSelectedId(undefined);
              }}
            >
              {t("reject")}
            </Button>
            <Button
              disabled={approve.isPending}
              onClick={() =>
                selectedId &&
                approve.mutate(selectedId, { onSuccess: () => setSelectedId(undefined) })
              }
            >
              {t("approve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rejectingId && (
        <RejectContributionDialog
          contributionId={rejectingId}
          open={rejectingId !== undefined}
          onOpenChange={(open) => !open && setRejectingId(undefined)}
        />
      )}
    </div>
  );
}
