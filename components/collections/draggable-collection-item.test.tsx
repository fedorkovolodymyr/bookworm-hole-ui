// components/collections/draggable-collection-item.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DndContext } from "@dnd-kit/core";
import { DraggableCollectionItem } from "./draggable-collection-item";
import type { CollectionItemResponse } from "@/lib/api/types";

const item: CollectionItemResponse = {
  id: "i1",
  collection_id: "c1",
  book_id: "b1",
  release_id: null,
  position: 0,
  added_at: "2020-01-01T00:00:00Z",
  note: null,
};

describe("DraggableCollectionItem", () => {
  it("renders its children inside a DndContext", () => {
    render(
      <DndContext>
        <DraggableCollectionItem item={item}>
          <p>Row content</p>
        </DraggableCollectionItem>
      </DndContext>,
    );
    expect(screen.getByText("Row content")).toBeInTheDocument();
  });
});
