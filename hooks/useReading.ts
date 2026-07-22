import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteSession,
  getActiveSessions,
  getSessions,
  getStats,
  getStreak,
  getTimeline,
  startSession,
  stopSession,
  updateSession,
} from "@/lib/api/reading";
import type {
  CreateReadingSessionPayload,
  ReadingSessionListParams,
  ReadingStatsPeriod,
  StopReadingSessionPayload,
  UpdateReadingSessionPayload,
} from "@/lib/api/types";

export function useActiveSessions() {
  return useQuery({
    queryKey: ["reading", "active"],
    queryFn: getActiveSessions,
    refetchOnWindowFocus: true,
  });
}

export function useSessions(params: ReadingSessionListParams = {}) {
  return useQuery({
    queryKey: ["reading", "sessions", params],
    queryFn: () => getSessions(params),
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReadingSessionPayload) => startSession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading", "active"] });
      queryClient.invalidateQueries({ queryKey: ["reading", "sessions"] });
    },
  });
}

export function useStopSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StopReadingSessionPayload) => stopSession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading", "active"] });
      queryClient.invalidateQueries({ queryKey: ["reading", "sessions"] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: UpdateReadingSessionPayload;
    }) => updateSession(sessionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading", "sessions"] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading", "sessions"] });
    },
  });
}

export function useReadingStats(period: ReadingStatsPeriod = "month") {
  return useQuery({
    queryKey: ["reading", "stats", period],
    queryFn: () => getStats(period),
  });
}

export function useReadingStreak() {
  return useQuery({
    queryKey: ["reading", "streak"],
    queryFn: getStreak,
  });
}

export function useReadingTimeline(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["reading", "timeline", fromDate, toDate],
    queryFn: () => getTimeline(fromDate, toDate),
  });
}
