import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as aiApi from "@/lib/api/ai";
import { useRecommendations, useSummary, useTagSuggestions } from "./useAi";

vi.mock("@/lib/api/ai");

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useAi hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useRecommendations calls recommendBooks", async () => {
    vi.mocked(aiApi.recommendBooks).mockResolvedValue({ book_ids: ["b1"] });
    const { result } = renderHook(() => useRecommendations(), { wrapper });
    result.current.mutate({ n: 5 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(aiApi.recommendBooks).toHaveBeenCalledWith({ n: 5 });
  });

  it("useSummary surfaces AiFeatureUnavailableError", async () => {
    vi.mocked(aiApi.generateSummary).mockRejectedValue(
      new aiApi.AiFeatureUnavailableError("summary"),
    );
    const { result } = renderHook(() => useSummary(), { wrapper });
    result.current.mutate({ text: "x" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(aiApi.AiFeatureUnavailableError);
  });

  it("useTagSuggestions calls suggestTags", async () => {
    vi.mocked(aiApi.suggestTags).mockResolvedValue({ tags: ["scifi"] });
    const { result } = renderHook(() => useTagSuggestions(), { wrapper });
    result.current.mutate({ book_id: "b1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(aiApi.suggestTags).toHaveBeenCalledWith({ book_id: "b1" });
  });
});
