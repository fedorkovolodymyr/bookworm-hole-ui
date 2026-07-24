import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateUser,
  deactivateUser,
  demoteUser,
  fetchAdminUsers,
  promoteUser,
  resetUserPassword,
} from "@/lib/api/admin-users";
import type { AdminUserListParams } from "@/lib/api/types";

export function useAdminUsers(params: AdminUserListParams = {}) {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => fetchAdminUsers(params),
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => activateUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deactivateUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function usePromoteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => promoteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useDemoteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => demoteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (userId: string) => resetUserPassword(userId),
  });
}
