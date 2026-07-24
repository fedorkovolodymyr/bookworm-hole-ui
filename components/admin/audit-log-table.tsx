"use client";

import { useTranslations } from "next-intl";
import type { AuditLogResponse } from "@/lib/api/types";

export function AuditLogTable({ logs }: { logs: AuditLogResponse[] }) {
  const t = useTranslations("admin.auditLogs");

  if (logs.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted-foreground border-border border-b text-left">
          <th className="py-2 font-medium">{t("table.actor")}</th>
          <th className="py-2 font-medium">{t("table.action")}</th>
          <th className="py-2 font-medium">{t("table.targetType")}</th>
          <th className="py-2 font-medium">{t("table.targetId")}</th>
          <th className="py-2 font-medium">{t("table.createdAt")}</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id} className="border-border border-b last:border-b-0">
            <td className="py-2 font-mono text-xs">{log.actor_id}</td>
            <td className="py-2">{t(`action.${log.action}`)}</td>
            <td className="py-2">{t(`targetType.${log.target_type}`)}</td>
            <td className="py-2 font-mono text-xs">{log.target_id}</td>
            <td className="py-2">{new Date(log.created_at).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
