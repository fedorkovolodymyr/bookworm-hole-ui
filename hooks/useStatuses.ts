import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStatus,
  deleteStatus,
  getBorrowed,
  getLentOut,
  getLibrary,
  getWishlist,
  lendStatus,
  listStatuses,
  returnStatus,
  updateStatus,
} from "@/lib/api/statuses";
import type {
  BookStatusKind,
  CreateStatusPayload,
  LendStatusPayload,
  StatusViewParams,
  UpdateStatusPayload,
} from "@/lib/api/types";

function invalidateStatuses(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["statuses"] });
}

export function useStatuses(status?: BookStatusKind) {
  return useQuery({
    queryKey: ["statuses", status],
    queryFn: () => listStatuses(status),
  });
}

export function useLibrary(
  params: StatusViewParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["statuses", "library", params],
    queryFn: () => getLibrary(params),
    enabled: options.enabled ?? true,
  });
}

export function useWishlist(params: StatusViewParams = {}) {
  return useQuery({
    queryKey: ["statuses", "wishlist", params],
    queryFn: () => getWishlist(params),
  });
}

export function useLentOut(params: StatusViewParams = {}) {
  return useQuery({
    queryKey: ["statuses", "lent-out", params],
    queryFn: () => getLentOut(params),
  });
}

export function useBorrowed(params: StatusViewParams = {}) {
  return useQuery({
    queryKey: ["statuses", "borrowed", params],
    queryFn: () => getBorrowed(params),
  });
}

export function useCreateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStatusPayload) => createStatus(payload),
    onSuccess: () => invalidateStatuses(queryClient),
  });
}

export function useUpdateStatus(statusId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateStatusPayload) => updateStatus(statusId, payload),
    onSuccess: () => invalidateStatuses(queryClient),
  });
}

export function useDeleteStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (statusId: string) => deleteStatus(statusId),
    onSuccess: () => invalidateStatuses(queryClient),
  });
}

export function useLendStatus(statusId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LendStatusPayload) => lendStatus(statusId, payload),
    onSuccess: () => invalidateStatuses(queryClient),
  });
}

export function useReturnStatus(statusId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => returnStatus(statusId),
    onSuccess: () => invalidateStatuses(queryClient),
  });
}
