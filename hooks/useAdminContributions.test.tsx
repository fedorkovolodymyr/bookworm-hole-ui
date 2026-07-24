import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import * as adminContributionsApi from "@/lib/api/admin-contributions";
import {
  useAdminContributions,
  useClaimContribution,
  useContributionDiff,
  useApproveContribution,
  useRejectContribution,
} from "./useAdminContributions";

vi.mock("@/lib/api/admin-contributions");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAdminContributions hooks", () => {
  beforeEach(() => {
    vi.mocked(adminContributionsApi.fetchAdminContributions).mockReset();
    vi.mocked(adminContributionsApi.claimContribution).mockReset();
    vi.mocked(adminContributionsApi.fetchContributionDiff).mockReset();
    vi.mocked(adminContributionsApi.approveContribution).mockReset();
    vi.mocked(adminContributionsApi.rejectContribution).mockReset();
  });

  it("useAdminContributions fetches a page by status", async () => {
    const page = { items: [], total: 0, limit: 10, offset: 0 };
    vi.mocked(adminContributionsApi.fetchAdminContributions).mockResolvedValue(page);

    const { result } = renderHook(() => useAdminContributions({ status: "submitted" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminContributionsApi.fetchAdminContributions).toHaveBeenCalledWith({
      status: "submitted",
    });
  });

  it("useClaimContribution calls claimContribution", async () => {
    vi.mocked(adminContributionsApi.claimContribution).mockResolvedValue({
      id: "c1",
    } as never);

    const { result } = renderHook(() => useClaimContribution(), { wrapper: createWrapper() });
    result.current.mutate("c1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminContributionsApi.claimContribution).toHaveBeenCalledWith("c1");
  });

  it("useContributionDiff fetches a diff when enabled", async () => {
    const diff = { proposed: {}, current: null, warnings: [] };
    vi.mocked(adminContributionsApi.fetchContributionDiff).mockResolvedValue(diff);

    const { result } = renderHook(() => useContributionDiff("c1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(diff);
  });

  it("useApproveContribution calls approveContribution", async () => {
    vi.mocked(adminContributionsApi.approveContribution).mockResolvedValue({
      id: "c1",
    } as never);

    const { result } = renderHook(() => useApproveContribution(), {
      wrapper: createWrapper(),
    });
    result.current.mutate("c1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminContributionsApi.approveContribution).toHaveBeenCalledWith("c1");
  });

  it("useRejectContribution calls rejectContribution with notes", async () => {
    vi.mocked(adminContributionsApi.rejectContribution).mockResolvedValue({
      id: "c1",
    } as never);

    const { result } = renderHook(() => useRejectContribution(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ contributionId: "c1", payload: { notes: "bad" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminContributionsApi.rejectContribution).toHaveBeenCalledWith("c1", {
      notes: "bad",
    });
  });
});
