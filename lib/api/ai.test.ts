import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { recommendBooks, generateSummary, suggestTags, AiFeatureUnavailableError } from "./ai";

vi.mock("./client", () => ({
  apiClient: { post: vi.fn() },
}));

describe("ai API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recommendBooks posts to /ai/recommend and returns book_ids", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { book_ids: ["b1", "b2"] } });
    const result = await recommendBooks({ user_id: "u1", n: 5 });
    expect(apiClient.post).toHaveBeenCalledWith("/ai/recommend", { user_id: "u1", n: 5 });
    expect(result.book_ids).toEqual(["b1", "b2"]);
  });

  it("recommendBooks throws AiFeatureUnavailableError on 501", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      response: {
        status: 501,
        data: { detail: "AI recommendation feature is not implemented yet" },
      },
    });
    await expect(recommendBooks({ user_id: "u1" })).rejects.toBeInstanceOf(
      AiFeatureUnavailableError,
    );
  });

  it("generateSummary posts to /ai/summary", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { summary: "short" } });
    const result = await generateSummary({ text: "long text" });
    expect(apiClient.post).toHaveBeenCalledWith("/ai/summary", { text: "long text" });
    expect(result.summary).toBe("short");
  });

  it("generateSummary throws AiFeatureUnavailableError on 501", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({ response: { status: 501, data: {} } });
    await expect(generateSummary({ text: "x" })).rejects.toBeInstanceOf(AiFeatureUnavailableError);
  });

  it("suggestTags posts to /ai/tag-suggest", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { tags: ["fantasy"] } });
    const result = await suggestTags({ book_id: "b1" });
    expect(apiClient.post).toHaveBeenCalledWith("/ai/tag-suggest", { book_id: "b1" });
    expect(result.tags).toEqual(["fantasy"]);
  });

  it("suggestTags throws AiFeatureUnavailableError on 501", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({ response: { status: 501, data: {} } });
    await expect(suggestTags({ book_id: "b1" })).rejects.toBeInstanceOf(AiFeatureUnavailableError);
  });

  it("propagates non-501 errors unchanged", async () => {
    const other = { response: { status: 422, data: { detail: "bad input" } } };
    vi.mocked(apiClient.post).mockRejectedValue(other);
    await expect(generateSummary({ text: "" })).rejects.toBe(other);
  });
});
