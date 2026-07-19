import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cancelDeletion,
  changePassword,
  deactivateAccount,
  scheduleDeletion,
  updateProfile,
} from "@/lib/api/users";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword });
}

export function useDeactivateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivateAccount,
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
  });
}

export function useScheduleDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: scheduleDeletion,
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
  });
}

export function useCancelDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelDeletion,
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
  });
}
