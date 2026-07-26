// components/collections/draggable-collection-item.tsx
"use client";

import * as React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
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
export function DraggableCollectionItem({
  item,
  children,
}: {
  item: CollectionItemResponse;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
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
