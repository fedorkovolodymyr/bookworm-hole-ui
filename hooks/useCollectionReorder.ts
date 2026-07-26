// hooks/useCollectionReorder.ts
import * as React from "react";
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useReorderCollectionItems } from "@/hooks/useCollections";
import type { CollectionItemResponse } from "@/lib/api/types";

/**
 * Owns local ordering state for a collection's items, plus the optimistic
 * reorder mutation (drag-and-drop and move-up/move-down share the same
 * commit path). Callers pass in the server-provided items array; this hook
 * keeps its own `orderedItems` in sync with it while allowing local,
 * optimistic reorders that are rolled back on mutation error.
 */
export function useCollectionReorder(
  collectionId: string,
  serverItems: CollectionItemResponse[] | undefined,
) {
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

  const reorderItems = useReorderCollectionItems(collectionId);

  // Require a small pointer-move before a drag activates so plain clicks on
  // the move-up/move-down/remove buttons inside each row still register as
  // clicks rather than being swallowed by the drag sensor.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  if (serverItems && serverItems !== syncedItems) {
    setSyncedItems(serverItems);
    setOrderedItems(serverItems);
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

  return { orderedItems, sensors, moveItem, handleDragEnd };
}
