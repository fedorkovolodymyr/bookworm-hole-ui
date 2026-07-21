// app/(app)/collections/[id]/page.tsx
"use client";

import * as React from "react";
import { use } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  useCollection,
  useDeleteCollection,
  useRemoveCollectionItem,
  useReorderCollectionItems,
} from "@/hooks/useCollections";
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
import type { CollectionItemResponse } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Only @dnd-kit/core is installed (no @dnd-kit/sortable), and
 * CollectionItemCard doesn't wire itself up as draggable/droppable. This
 * wrapper makes each row both a drag source and a drop target so DndContext
 * has something to fire DragEnd events against; CollectionItemCard's
 * move-up/move-down buttons remain the primary accessible/keyboard path and
 * work independently of this wrapper.
 */
function DraggableCollectionItem({
  item,
  children,
}: {
  item: CollectionItemResponse;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: item.id,
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: item.id });

  return (
    <div
      ref={(node) => {
        setDraggableRef(node);
        setDroppableRef(node);
      }}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-none",
        isDragging && "opacity-50",
        isOver && "ring-primary rounded-xl ring-2",
      )}
    >
      {children}
    </div>
  );
}

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("collections");
  const router = useRouter();
  const { data: collection, isPending, isError } = useCollection(id);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [orderedItems, setOrderedItems] = React.useState<CollectionItemResponse[]>([]);
  // Tracks which server-provided items array `orderedItems` was last synced
  // from, so local optimistic reorders aren't clobbered on every render but
  // still pick up fresh data after refetches/invalidations. Adjusting state
  // during render (rather than in a useEffect) avoids the extra render pass
  // an effect-based sync would cause — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [syncedItems, setSyncedItems] = React.useState<CollectionItemResponse[] | undefined>(
    undefined,
  );

  const removeItem = useRemoveCollectionItem(id);
  const reorderItems = useReorderCollectionItems(id);
  const deleteCollection = useDeleteCollection();

  // Require a small pointer-move before a drag activates so plain clicks on
  // the move-up/move-down/remove buttons inside each row still register as
  // clicks rather than being swallowed by the drag sensor.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  if (collection && collection.items.items !== syncedItems) {
    setSyncedItems(collection.items.items);
    setOrderedItems(collection.items.items);
  }

  function commitOrder(next: CollectionItemResponse[]) {
    const previous = orderedItems;
    setOrderedItems(next);
    reorderItems.mutate(
      next.map((item) => item.id),
      { onError: () => setOrderedItems(previous) },
    );
  }

  function moveItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedItems.length) return;
    const next = [...orderedItems];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    commitOrder(next);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedItems.findIndex((item) => item.id === active.id);
    const newIndex = orderedItems.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...orderedItems];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    commitOrder(next);
  }

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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
