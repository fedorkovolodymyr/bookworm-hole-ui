import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveContribution,
  claimContribution,
  fetchAdminContributions,
  fetchContributionDiff,
  rejectContribution,
} from "@/lib/api/admin-contributions";
import type { ContributionStatus, RejectContributionPayload } from "@/lib/api/types";

export function useAdminContributions(
  params: { status?: ContributionStatus; skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["admin", "contributions", params],
    queryFn: () => fetchAdminContributions(params),
  });
}

export function useClaimContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contributionId: string) => claimContribution(contributionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "contributions"] }),
  });
}

export function useContributionDiff(contributionId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "contributions", contributionId, "diff"],
    queryFn: () => fetchContributionDiff(contributionId as string),
    enabled: Boolean(contributionId),
  });
}

export function useApproveContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contributionId: string) => approveContribution(contributionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "contributions"] }),
  });
}

export function useRejectContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contributionId,
      payload,
    }: {
      contributionId: string;
      payload: RejectContributionPayload;
    }) => rejectContribution(contributionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "contributions"] }),
  });
}
