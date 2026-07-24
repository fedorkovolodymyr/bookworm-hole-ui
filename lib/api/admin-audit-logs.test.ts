// lib/api/admin-audit-logs.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { fetchAuditLogs } from "./admin-audit-logs";

vi.mock("./client", () => ({
  apiClient: { get: vi.fn() },
}));

describe("admin-audit-logs API client", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("fetches paginated audit logs with filters", async () => {
    const page = { items: [], total: 0, limit: 10, offset: 0 };
    vi.mocked(apiClient.get).mockResolvedValue({ data: page });

    const result = await fetchAuditLogs({ limit: 10, action: "promote_user" });

    expect(apiClient.get).toHaveBeenCalledWith("/admin/audit-logs/", {
      params: { limit: 10, action: "promote_user" },
    });
    expect(result).toEqual(page);
  });

  it("fetches with no filters", async () => {
    const page = { items: [], total: 0, limit: 10, offset: 0 };
    vi.mocked(apiClient.get).mockResolvedValue({ data: page });

    await fetchAuditLogs();

    expect(apiClient.get).toHaveBeenCalledWith("/admin/audit-logs/", { params: {} });
  });
});
