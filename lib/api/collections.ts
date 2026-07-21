import { apiClient } from "./client";
import type {
  AddCollectionItemPayload,
  CollectionDetailResponse,
  CollectionItemListParams,
  CollectionItemResponse,
  CollectionListParams,
  CollectionResponse,
  CreateCollectionPayload,
  Page,
  UpdateCollectionItemPayload,
  UpdateCollectionPayload,
} from "./types";

export async function listCollections(
  params: CollectionListParams = {},
): Promise<Page<CollectionResponse>> {
  const { data } = await apiClient.get("/collections", { params });
  return data;
}

export async function getCollection(
  collectionId: string,
  params: CollectionItemListParams = {},
): Promise<CollectionDetailResponse> {
  const { data } = await apiClient.get(`/collections/${collectionId}`, { params });
  return data;
}

export async function createCollection(
  payload: CreateCollectionPayload,
): Promise<CollectionResponse> {
  const { data } = await apiClient.post("/collections", payload);
  return data;
}

export async function updateCollection(
  collectionId: string,
  payload: UpdateCollectionPayload,
): Promise<CollectionResponse> {
  const { data } = await apiClient.patch(`/collections/${collectionId}`, payload);
  return data;
}

export async function deleteCollection(collectionId: string): Promise<void> {
  await apiClient.delete(`/collections/${collectionId}`);
}

export async function addCollectionItem(
  collectionId: string,
  payload: AddCollectionItemPayload,
): Promise<CollectionItemResponse> {
  const { data } = await apiClient.post(`/collections/${collectionId}/items`, payload);
  return data;
}

export async function updateCollectionItem(
  collectionId: string,
  itemId: string,
  payload: UpdateCollectionItemPayload,
): Promise<CollectionItemResponse> {
  const { data } = await apiClient.patch(
    `/collections/${collectionId}/items/${itemId}`,
    payload,
  );
  return data;
}

export async function removeCollectionItem(collectionId: string, itemId: string): Promise<void> {
  await apiClient.delete(`/collections/${collectionId}/items/${itemId}`);
}

export async function reorderCollectionItems(
  collectionId: string,
  itemIds: string[],
): Promise<void> {
  await apiClient.post(`/collections/${collectionId}/reorder`, { item_ids: itemIds });
}
