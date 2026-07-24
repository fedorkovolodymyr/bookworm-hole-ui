// lib/api/admin-catalog-imports.ts
import { apiClient } from "./client";
import type { CatalogImportJobStatusResponse, CatalogImportRequest } from "./types";

export async function startCatalogImport(
  payload: CatalogImportRequest,
): Promise<CatalogImportJobStatusResponse> {
  const { data } = await apiClient.post("/admin/catalog-imports", payload);
  return data;
}

export async function fetchCatalogImportStatus(
  jobId: string,
): Promise<CatalogImportJobStatusResponse> {
  const { data } = await apiClient.get(`/admin/catalog-imports/${jobId}`);
  return data;
}
