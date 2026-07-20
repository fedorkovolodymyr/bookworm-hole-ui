// hooks/useContributions.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContribution,
  deleteContribution,
  getContribution,
  listOwnContributions,
  submitContribution,
  updateContribution,
} from "@/lib/api/contributions";
import type { CreateContributionPayload, UpdateContributionPayload } from "@/lib/api/types";

export function useMyContributions(params: { skip?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ["contributions", "me", params],
    queryFn: () => listOwnContributions(params),
  });
}

export function useContribution(contributionId: string | undefined) {
  return useQuery({
    queryKey: ["contributions", contributionId],
    queryFn: () => getContribution(contributionId as string),
    enabled: Boolean(contributionId),
  });
}

export function useCreateContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateContributionPayload) => createContribution(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contributions", "me"] }),
  });
}

export function useUpdateContribution(contributionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateContributionPayload) => updateContribution(contributionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributions", contributionId] });
      queryClient.invalidateQueries({ queryKey: ["contributions", "me"] });
    },
  });
}

export function useSubmitContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contributionId: string) => submitContribution(contributionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contributions", "me"] }),
  });
}

export function useDeleteContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contributionId: string) => deleteContribution(contributionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contributions", "me"] }),
  });
}
