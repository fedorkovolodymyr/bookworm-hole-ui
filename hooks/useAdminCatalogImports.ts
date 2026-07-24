import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchCatalogImportStatus, startCatalogImport } from "@/lib/api/admin-catalog-imports";
import type { CatalogImportJobStatusResponse, CatalogImportRequest } from "@/lib/api/types";

const TERMINAL_STATUSES = ["completed", "failed", "errored"];

function isTerminal(status: CatalogImportJobStatusResponse | undefined): boolean {
  if (!status) return false;
  return TERMINAL_STATUSES.includes(status.status) || status.result != null;
}

export function useStartCatalogImport() {
  return useMutation({
    mutationFn: (payload: CatalogImportRequest) => startCatalogImport(payload),
  });
}

export function useCatalogImportStatus(jobId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "catalog-imports", jobId],
    queryFn: () => fetchCatalogImportStatus(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) => (isTerminal(query.state.data) ? false : 2000),
  });
}
