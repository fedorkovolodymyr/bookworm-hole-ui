import { apiClient } from "./client";
import type { ExternalSearchResponse } from "./types";

export async function searchExternal(
  query: string,
  sources?: string[],
): Promise<ExternalSearchResponse> {
  const { data } = await apiClient.get("/external/search", {
    params: { q: query, sources: sources?.join(",") },
  });
  return data;
}
