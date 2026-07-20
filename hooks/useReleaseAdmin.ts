// hooks/useReleaseAdmin.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addReleaseContributor,
  createRelease,
  removeReleaseContributor,
  updateRelease,
} from "@/lib/api/releases-admin";
import type { AddContributorPayload, ContributorRole, CreateReleasePayload, UpdateReleasePayload } from "@/lib/api/types";

export function useCreateRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReleasePayload) => createRelease(payload),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ["books", variables.book_id] }),
  });
}

export function useUpdateRelease(releaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateReleasePayload) => updateRelease(releaseId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["releases", releaseId] }),
  });
}

export function useAddReleaseContributor(releaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddContributorPayload) => addReleaseContributor(releaseId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["releases", releaseId] }),
  });
}

export function useRemoveReleaseContributor(releaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contributorId, role }: { contributorId: string; role: ContributorRole }) =>
      removeReleaseContributor(releaseId, contributorId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["releases", releaseId] }),
  });
}
