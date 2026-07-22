import { apiClient } from "./client";
import type {
  CreateReadingSessionPayload,
  ReadingSessionListParams,
  ReadingSessionResponse,
  ReadingStatsPeriod,
  ReadingStatsResponse,
  StopReadingSessionPayload,
  StreakResponse,
  TimelineResponse,
  UpdateReadingSessionPayload,
} from "./types";

export async function getActiveSessions(): Promise<ReadingSessionResponse[]> {
  const { data } = await apiClient.get("/me/reading/active");
  return data;
}

export async function getSessions(
  params: ReadingSessionListParams = {},
): Promise<ReadingSessionResponse[]> {
  const { data } = await apiClient.get("/me/reading/sessions", { params });
  return data;
}

export async function startSession(
  payload: CreateReadingSessionPayload,
): Promise<ReadingSessionResponse> {
  const { data } = await apiClient.post("/me/reading/start", payload);
  return data;
}

export async function stopSession(
  payload: StopReadingSessionPayload,
): Promise<ReadingSessionResponse> {
  const { data } = await apiClient.post("/me/reading/stop", payload);
  return data;
}

export async function updateSession(
  sessionId: string,
  payload: UpdateReadingSessionPayload,
): Promise<ReadingSessionResponse> {
  const { data } = await apiClient.patch(`/me/reading/sessions/${sessionId}`, payload);
  return data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/me/reading/sessions/${sessionId}`);
}

export async function getStats(
  period: ReadingStatsPeriod = "month",
): Promise<ReadingStatsResponse> {
  const { data } = await apiClient.get("/me/reading/stats", { params: { period } });
  return data;
}

export async function getStreak(): Promise<StreakResponse> {
  const { data } = await apiClient.get("/me/reading/streak");
  return data;
}

export async function getTimeline(fromDate: string, toDate: string): Promise<TimelineResponse> {
  const { data } = await apiClient.get("/me/reading/timeline", {
    params: { from_date: fromDate, to_date: toDate },
  });
  return data;
}
