import { useMutation } from "@tanstack/react-query";
import { generateSummary, recommendBooks, suggestTags } from "@/lib/api/ai";
import type { RecommendRequest, SummaryRequest, TagSuggestRequest } from "@/lib/api/types";

export function useRecommendations() {
  return useMutation({
    mutationFn: (req: RecommendRequest) => recommendBooks(req),
  });
}

export function useSummary() {
  return useMutation({
    mutationFn: (req: SummaryRequest) => generateSummary(req),
  });
}

export function useTagSuggestions() {
  return useMutation({
    mutationFn: (req: TagSuggestRequest) => suggestTags(req),
  });
}
