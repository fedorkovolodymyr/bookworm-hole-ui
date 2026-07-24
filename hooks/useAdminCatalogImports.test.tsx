import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import * as adminCatalogImportsApi from "@/lib/api/admin-catalog-imports";
import { useStartCatalogImport, useCatalogImportStatus } from "./useAdminCatalogImports";

vi.mock("@/lib/api/admin-catalog-imports");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAdminCatalogImports hooks", () => {
  beforeEach(() => {
    vi.mocked(adminCatalogImportsApi.startCatalogImport).mockReset();
    vi.mocked(adminCatalogImportsApi.fetchCatalogImportStatus).mockReset();
  });

  it("useStartCatalogImport calls startCatalogImport", async () => {
    vi.mocked(adminCatalogImportsApi.startCatalogImport).mockResolvedValue({
      job_id: "job1",
      status: "pending",
    });

    const { result } = renderHook(() => useStartCatalogImport(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ profile: "books" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminCatalogImportsApi.startCatalogImport).toHaveBeenCalledWith({
      profile: "books",
    });
  });

  it("useCatalogImportStatus fetches status when jobId is set", async () => {
    vi.mocked(adminCatalogImportsApi.fetchCatalogImportStatus).mockResolvedValue({
      job_id: "job1",
      status: "completed",
      result: { imported: 3 },
    });

    const { result } = renderHook(() => useCatalogImportStatus("job1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe("completed");
  });

  it("useCatalogImportStatus is disabled without a jobId", () => {
    const { result } = renderHook(() => useCatalogImportStatus(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(adminCatalogImportsApi.fetchCatalogImportStatus).not.toHaveBeenCalled();
  });
});
