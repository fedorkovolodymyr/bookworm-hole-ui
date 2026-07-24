import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import {
  fetchAdminContributions,
  claimContribution,
  fetchContributionDiff,
  approveContribution,
  rejectContribution,
} from "./admin-contributions";

vi.mock("./client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

describe("admin-contributions API client", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
  });

  it("fetches paginated contributions by status", async () => {
    const page = { items: [], total: 0, limit: 10, offset: 0 };
    vi.mocked(apiClient.get).mockResolvedValue({ data: page });

    const result = await fetchAdminContributions({ status: "submitted", limit: 10 });

    expect(apiClient.get).toHaveBeenCalledWith("/admin/contributions/", {
      params: { status: "submitted", limit: 10 },
    });
    expect(result).toEqual(page);
  });

  it("claims a contribution", async () => {
    const contribution = { id: "c1", status: "under_review" };
    vi.mocked(apiClient.post).mockResolvedValue({ data: contribution });

    const result = await claimContribution("c1");

    expect(apiClient.post).toHaveBeenCalledWith("/admin/contributions/c1/claim");
    expect(result).toEqual(contribution);
  });

  it("fetches a contribution diff", async () => {
    const diff = { proposed: {}, current: null, warnings: [] };
    vi.mocked(apiClient.get).mockResolvedValue({ data: diff });

    const result = await fetchContributionDiff("c1");

    expect(apiClient.get).toHaveBeenCalledWith("/admin/contributions/c1/diff");
    expect(result).toEqual(diff);
  });

  it("approves a contribution", async () => {
    const contribution = { id: "c1", status: "approved" };
    vi.mocked(apiClient.post).mockResolvedValue({ data: contribution });

    const result = await approveContribution("c1");

    expect(apiClient.post).toHaveBeenCalledWith("/admin/contributions/c1/approve");
    expect(result).toEqual(contribution);
  });

  it("rejects a contribution with notes", async () => {
    const contribution = { id: "c1", status: "rejected" };
    vi.mocked(apiClient.post).mockResolvedValue({ data: contribution });

    const result = await rejectContribution("c1", { notes: "bad data" });

    expect(apiClient.post).toHaveBeenCalledWith("/admin/contributions/c1/reject", {
      notes: "bad data",
    });
    expect(result).toEqual(contribution);
  });
});
