"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  useBorrowed,
  useLentOut,
  useLibrary,
  useUpdateStatus,
  useWishlist,
} from "@/hooks/useStatuses";
import { StatusListItem } from "@/components/statuses/status-list-item";
import { LendDialog } from "@/components/statuses/lend-dialog";
import { ReturnConfirmDialog } from "@/components/statuses/return-confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BookStatusKind, BookStatusResponse } from "@/lib/api/types";

const STATUS_KINDS: BookStatusKind[] = [
  "owned",
  "wishlist",
  "pre_order",
  "lent_out",
  "borrowed",
  "gifted_away",
  "sold",
  "lost",
];

function StatusTabPanel({
  query,
}: {
  query: ReturnType<typeof useLibrary>;
}) {
  const t = useTranslations("statuses");
  const kindT = useTranslations("statuses.kind");
  const [changingId, setChangingId] = React.useState<string | null>(null);
  const updateStatus = useUpdateStatus(changingId ?? "");
  const [lendingId, setLendingId] = React.useState<string | null>(null);
  const [returningId, setReturningId] = React.useState<string | null>(null);

  if (query.isPending) {
    return <Skeleton className="h-40 w-full" />;
  }
  const items = query.data?.items ?? [];
  if (items.length === 0) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((status: BookStatusResponse) => (
        <React.Fragment key={status.id}>
          <StatusListItem
            status={status}
            onChangeStatus={() => setChangingId(status.id)}
            onLend={() => setLendingId(status.id)}
            onReturn={() => setReturningId(status.id)}
          />
          {changingId === status.id && (
            <Select
              value={status.status}
              onValueChange={(value) => {
                updateStatus.mutate(
                  { status: value as BookStatusKind },
                  { onSuccess: () => setChangingId(null) },
                );
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {kindT(kind)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {lendingId === status.id && (
            <LendDialog
              statusId={status.id}
              open={true}
              onOpenChange={(open) => !open && setLendingId(null)}
            />
          )}
          {returningId === status.id && (
            <ReturnConfirmDialog
              statusId={status.id}
              open={true}
              onOpenChange={(open) => !open && setReturningId(null)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function LibraryPage() {
  const t = useTranslations("statuses");
  const library = useLibrary();
  const wishlist = useWishlist();
  const lentOut = useLentOut();
  const borrowed = useBorrowed();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">{t("tabs.library")}</TabsTrigger>
          <TabsTrigger value="wishlist">{t("tabs.wishlist")}</TabsTrigger>
          <TabsTrigger value="lentOut">{t("tabs.lentOut")}</TabsTrigger>
          <TabsTrigger value="borrowed">{t("tabs.borrowed")}</TabsTrigger>
        </TabsList>
        <TabsContent value="library">
          <StatusTabPanel query={library} />
        </TabsContent>
        <TabsContent value="wishlist">
          <StatusTabPanel query={wishlist} />
        </TabsContent>
        <TabsContent value="lentOut">
          <StatusTabPanel query={lentOut} />
        </TabsContent>
        <TabsContent value="borrowed">
          <StatusTabPanel query={borrowed} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
