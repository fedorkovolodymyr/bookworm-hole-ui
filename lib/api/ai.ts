import { apiClient } from "./client";
import { isAxiosError } from "./errors";
import type {
  RecommendRequest,
  RecommendResponse,
  SummaryRequest,
  SummaryResponse,
  TagSuggestRequest,
  TagSuggestResponse,
} from "./types";

export class AiFeatureUnavailableError extends Error {
  constructor(feature: string) {
    super(`${feature} is not implemented yet`);
    this.name = "AiFeatureUnavailableError";
  }
}

function rethrow501(error: unknown, feature: string): never {
  if (isAxiosError(error) && error.response?.status === 501) {
    throw new AiFeatureUnavailableError(feature);
  }
  throw error;
}

export async function recommendBooks(req: RecommendRequest): Promise<RecommendResponse> {
  try {
    const { data } = await apiClient.post("/ai/recommend", req);
    return data;
  } catch (error) {
    rethrow501(error, "recommend");
  }
}

export async function generateSummary(req: SummaryRequest): Promise<SummaryResponse> {
  try {
    const { data } = await apiClient.post("/ai/summary", req);
    return data;
  } catch (error) {
    rethrow501(error, "summary");
  }
}

export async function suggestTags(req: TagSuggestRequest): Promise<TagSuggestResponse> {
  try {
    const { data } = await apiClient.post("/ai/tag-suggest", req);
    return data;
  } catch (error) {
    rethrow501(error, "tag-suggest");
  }
}
