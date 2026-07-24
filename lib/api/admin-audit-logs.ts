import { apiClient } from "./client";
import type { AdminAuditLogListParams, AuditLogResponse, Page } from "./types";

export async function fetchAuditLogs(
  params: AdminAuditLogListParams = {},
): Promise<Page<AuditLogResponse>> {
  const { data } = await apiClient.get("/admin/audit-logs/", { params });
  return data;
}
