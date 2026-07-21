"use client";

import { useTranslations } from "next-intl";
import { useCollections, useAddCollectionItem } from "@/hooks/useCollections";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";

function AddToCollectionItem({
  collectionId,
  collectionName,
  bookId,
  releaseId,
}: {
  collectionId: string;
  collectionName: string;
  bookId?: string;
  releaseId?: string;
}) {
  const t = useTranslations("collections.addToCollection");
  const addItem = useAddCollectionItem(collectionId);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className="hover:bg-accent rounded-md p-2 text-left text-sm"
        onClick={() => addItem.mutate({ book_id: bookId ?? null, release_id: releaseId ?? null })}
      >
        {collectionName}
      </button>
      {addItem.isSuccess && (
        <p className="text-muted-foreground text-xs">{t("added", { name: collectionName })}</p>
      )}
      {addItem.error && (
        <p className="text-destructive text-xs">{extractErrorMessage(addItem.error)}</p>
      )}
    </div>
  );
}

export function AddToCollectionDialog({ bookId, releaseId }: { bookId?: string; releaseId?: string }) {
  const t = useTranslations("collections.addToCollection");
  const { data: collectionsPage } = useCollections();
  const collections = collectionsPage?.items ?? [];

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{t("trigger")}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        {collections.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noCollections")}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {collections.map((collection) => (
              <AddToCollectionItem
                key={collection.id}
                collectionId={collection.id}
                collectionName={collection.name}
                bookId={bookId}
                releaseId={releaseId}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
