import { apiClient } from "./client";
import type {
  BookStatusKind,
  BookStatusResponse,
  CreateStatusPayload,
  LendStatusPayload,
  Page,
  StatusViewParams,
  UpdateStatusPayload,
} from "./types";

export async function listStatuses(status?: BookStatusKind): Promise<BookStatusResponse[]> {
  const { data } = await apiClient.get("/me/statuses", { params: status ? { status } : {} });
  return data;
}

export async function createStatus(payload: CreateStatusPayload): Promise<BookStatusResponse> {
  const { data } = await apiClient.post("/me/statuses", payload);
  return data;
}

export async function updateStatus(
  statusId: string,
  payload: UpdateStatusPayload,
): Promise<BookStatusResponse> {
  const { data } = await apiClient.patch(`/me/statuses/${statusId}`, payload);
  return data;
}

export async function deleteStatus(statusId: string): Promise<void> {
  await apiClient.delete(`/me/statuses/${statusId}`);
}

export async function lendStatus(
  statusId: string,
  payload: LendStatusPayload,
): Promise<BookStatusResponse> {
  const { data } = await apiClient.post(`/me/statuses/${statusId}/lend`, payload);
  return data;
}

export async function returnStatus(statusId: string): Promise<BookStatusResponse> {
  const { data } = await apiClient.post(`/me/statuses/${statusId}/return`, {});
  return data;
}

async function getStatusView(
  view: "library" | "wishlist" | "lent-out" | "borrowed",
  params: StatusViewParams = {},
): Promise<Page<BookStatusResponse>> {
  const { data } = await apiClient.get(`/me/${view}`, { params });
  return data;
}

export const getLibrary = (params: StatusViewParams = {}) => getStatusView("library", params);
export const getWishlist = (params: StatusViewParams = {}) => getStatusView("wishlist", params);
export const getLentOut = (params: StatusViewParams = {}) => getStatusView("lent-out", params);
export const getBorrowed = (params: StatusViewParams = {}) => getStatusView("borrowed", params);
