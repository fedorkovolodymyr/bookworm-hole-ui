// app/(app)/collections/page.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCollections } from "@/hooks/useCollections";
import { CollectionCard } from "@/components/collections/collection-card";
import { CollectionForm } from "@/components/collections/collection-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CollectionsPage() {
  const t = useTranslations("collections");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { data: collectionsPage, isPending } = useCollections();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>{t("newCollection")}</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("form.createTitle")}</DialogTitle>
            </DialogHeader>
            <CollectionForm onSuccess={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {isPending && <Skeleton className="h-40 w-full" />}
      {!isPending && collectionsPage?.items.length === 0 && (
        <p className="text-muted-foreground">{t("empty")}</p>
      )}
      {!isPending && collectionsPage && collectionsPage.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collectionsPage.items.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  );
}
