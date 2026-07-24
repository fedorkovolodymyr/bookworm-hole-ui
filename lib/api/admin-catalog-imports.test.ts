// lib/api/admin-catalog-imports.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { startCatalogImport, fetchCatalogImportStatus } from "./admin-catalog-imports";

vi.mock("./client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

describe("admin-catalog-imports API client", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
  });

  it("starts a catalog import job", async () => {
    const status = { job_id: "job1", status: "pending" };
    vi.mocked(apiClient.post).mockResolvedValue({ data: status });

    const result = await startCatalogImport({ profile: "books" });

    expect(apiClient.post).toHaveBeenCalledWith("/admin/catalog-imports", {
      profile: "books",
    });
    expect(result).toEqual(status);
  });

  it("fetches a catalog import job's status", async () => {
    const status = { job_id: "job1", status: "completed", result: { imported: 5 } };
    vi.mocked(apiClient.get).mockResolvedValue({ data: status });

    const result = await fetchCatalogImportStatus("job1");

    expect(apiClient.get).toHaveBeenCalledWith("/admin/catalog-imports/job1");
    expect(result).toEqual(status);
  });
});
