import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "@/lib/api/admin-audit-logs";
import type { AdminAuditLogListParams } from "@/lib/api/types";

export function useAdminAuditLogs(params: AdminAuditLogListParams = {}) {
  return useQuery({
    queryKey: ["admin", "audit-logs", params],
    queryFn: () => fetchAuditLogs(params),
  });
}
