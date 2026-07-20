// hooks/useExternalSearch.ts
import { useQuery } from "@tanstack/react-query";
import { searchExternal } from "@/lib/api/external";

export function useExternalSearch(query: string, sources?: string[]) {
  return useQuery({
    queryKey: ["external", "search", query, sources],
    queryFn: () => searchExternal(query, sources),
    enabled: query.trim().length > 0,
  });
}
