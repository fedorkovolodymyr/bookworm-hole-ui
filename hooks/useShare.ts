// hooks/useShare.ts
import { useMutation } from "@tanstack/react-query";
import { shareBook, shareCollection } from "@/lib/api/share";
import type { SharePayload } from "@/lib/api/types";

export function useShareBook() {
  return useMutation({
    mutationFn: ({ bookId, payload }: { bookId: string; payload: SharePayload }) =>
      shareBook(bookId, payload),
  });
}

export function useShareCollection() {
  return useMutation({
    mutationFn: ({ collectionId, payload }: { collectionId: string; payload: SharePayload }) =>
      shareCollection(collectionId, payload),
  });
}
