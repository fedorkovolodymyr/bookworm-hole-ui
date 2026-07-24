// app/(app)/collections/[id]/page.tsx
"use client";

import * as React from "react";
import { use } from "react";
import { useTranslations } from "next-intl";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  useCollection,
  useDeleteCollection,
  useRemoveCollectionItem,
} from "@/hooks/useCollections";
import { useCollectionReorder } from "@/hooks/useCollectionReorder";
import { DraggableCollectionItem } from "@/components/collections/draggable-collection-item";
import { CollectionItemCard } from "@/components/collections/collection-item-card";
import { CollectionForm } from "@/components/collections/collection-form";
import { ShareDialog } from "@/components/share/share-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("collections");
  const router = useRouter();
  const { data: collection, isPending, isError } = useCollection(id);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const removeItem = useRemoveCollectionItem(id);
  const deleteCollection = useDeleteCollection();
  const { orderedItems, sensors, moveItem, handleDragEnd } = useCollectionReorder(
    id,
    collection?.items.items,
  );

  if (isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (isError || !collection) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{collection.name}</h1>
          {collection.description && (
            <p className="text-muted-foreground">{collection.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <ShareDialog kind="collection" targetId={collection.id} />
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              {t("detail.editButton")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("form.editTitle")}</DialogTitle>
              </DialogHeader>
              <CollectionForm collection={collection} onSuccess={() => setEditOpen(false)} />
            </DialogContent>
          </Dialog>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger render={<Button variant="destructive" size="sm" />}>
              {t("detail.deleteButton")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("detail.deleteConfirmTitle")}</DialogTitle>
                <DialogDescription>{t("detail.deleteConfirmDescription")}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="destructive"
                  disabled={deleteCollection.isPending}
                  onClick={() =>
                    deleteCollection.mutate(collection.id, {
                      onSuccess: () => router.push("/collections"),
                    })
                  }
                >
                  {t("detail.deleteButton")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("detail.itemsTitle")}</h2>
        {orderedItems.length === 0 && (
          <p className="text-muted-foreground">{t("detail.emptyItems")}</p>
        )}
        {orderedItems.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-col gap-2">
              {orderedItems.map((item, index) => (
                <DraggableCollectionItem key={item.id} item={item}>
                  <CollectionItemCard
                    item={item}
                    isFirst={index === 0}
                    isLast={index === orderedItems.length - 1}
                    onMoveUp={() => moveItem(index, -1)}
                    onMoveDown={() => moveItem(index, 1)}
                    onRemove={() => removeItem.mutate(item.id)}
                  />
                </DraggableCollectionItem>
              ))}
            </div>
          </DndContext>
        )}
      </section>
    </div>
  );
}
