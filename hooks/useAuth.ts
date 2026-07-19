// hooks/useAuth.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  confirmEmailVerification,
  loginUser,
  logoutUser,
  registerUser,
  requestEmailVerification,
} from "@/lib/api/auth";

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => queryClient.removeQueries({ queryKey: ["me"] }),
  });
}

export function useRequestEmailVerification() {
  return useMutation({ mutationFn: requestEmailVerification });
}

export function useConfirmEmailVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmEmailVerification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}
