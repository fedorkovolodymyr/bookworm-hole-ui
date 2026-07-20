import { apiClient } from "./client";
import type { BookWithReleasesResponse, ExternalSearchResponse, ImportBookPayload } from "./types";

export async function searchExternal(
  query: string,
  sources?: string[],
): Promise<ExternalSearchResponse> {
  const { data } = await apiClient.get("/external/search", {
    params: { q: query, sources: sources?.join(",") },
  });
  return data;
}

export async function importBook(payload: ImportBookPayload): Promise<BookWithReleasesResponse> {
  const { data } = await apiClient.post("/external/import", payload);
  return data;
}
