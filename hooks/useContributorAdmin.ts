// hooks/useContributorAdmin.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createContributor, updateContributor } from "@/lib/api/contributors-admin";
import type { CreateContributorPayload, UpdateContributorPayload } from "@/lib/api/types";

export function useCreateContributor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateContributorPayload) => createContributor(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contributors"] }),
  });
}

export function useUpdateContributor(contributorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateContributorPayload) => updateContributor(contributorId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributors", contributorId] });
      queryClient.invalidateQueries({ queryKey: ["contributors"] });
    },
  });
}
