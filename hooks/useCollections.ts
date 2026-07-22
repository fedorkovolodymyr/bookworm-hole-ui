// hooks/useCollections.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCollectionItem,
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  removeCollectionItem,
  reorderCollectionItems,
  updateCollection,
  updateCollectionItem,
} from "@/lib/api/collections";
import type {
  AddCollectionItemPayload,
  CollectionItemListParams,
  CollectionListParams,
  CreateCollectionPayload,
  UpdateCollectionItemPayload,
  UpdateCollectionPayload,
} from "@/lib/api/types";

export function useCollections(params: CollectionListParams = {}) {
  return useQuery({
    queryKey: ["collections", params],
    queryFn: () => listCollections(params),
  });
}

export function useCollection(
  collectionId: string | undefined,
  params: CollectionItemListParams = {},
) {
  return useQuery({
    queryKey: ["collections", collectionId, params],
    queryFn: () => getCollection(collectionId as string, params),
    enabled: Boolean(collectionId),
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCollectionPayload) => createCollection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useUpdateCollection(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCollectionPayload) => updateCollection(collectionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (collectionId: string) => deleteCollection(collectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useAddCollectionItem(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddCollectionItemPayload) => addCollectionItem(collectionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
    },
  });
}

export function useUpdateCollectionItem(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: UpdateCollectionItemPayload }) =>
      updateCollectionItem(collectionId, itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
    },
  });
}

export function useRemoveCollectionItem(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => removeCollectionItem(collectionId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
    },
  });
}

export function useReorderCollectionItems(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) => reorderCollectionItems(collectionId, itemIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
    },
  });
}
