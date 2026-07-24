"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminAuditLogListParams, AuditAction, AuditTargetType } from "@/lib/api/types";

const ACTIONS: AuditAction[] = [
  "approve_contribution",
  "reject_contribution",
  "claim_contribution",
  "activate_user",
  "deactivate_user",
  "promote_user",
  "demote_user",
];

const TARGET_TYPES: AuditTargetType[] = ["contribution", "user"];

export function AuditLogFilters({
  value,
  onChange,
}: {
  value: AdminAuditLogListParams;
  onChange: (params: AdminAuditLogListParams) => void;
}) {
  const t = useTranslations("admin.auditLogs.filters");

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-actor-id" className="text-sm font-medium">
          {t("actorIdLabel")}
        </label>
        <Input
          id="filter-actor-id"
          placeholder={t("actorIdPlaceholder")}
          value={value.actor_id ?? ""}
          onChange={(e) => onChange({ ...value, actor_id: e.target.value || undefined })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-action" className="text-sm font-medium">
          {t("actionLabel")}
        </label>
        <Select
          value={value.action ?? "all"}
          onValueChange={(next) =>
            onChange({ ...value, action: next === "all" ? undefined : (next as AuditAction) })
          }
        >
          <SelectTrigger id="filter-action">
            <SelectValue placeholder={t("actionAll")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("actionAll")}</SelectItem>
            {ACTIONS.map((action) => (
              <SelectItem key={action} value={action}>
                {action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-target-type" className="text-sm font-medium">
          {t("targetTypeLabel")}
        </label>
        <Select
          value={value.target_type ?? "all"}
          onValueChange={(next) =>
            onChange({
              ...value,
              target_type: next === "all" ? undefined : (next as AuditTargetType),
            })
          }
        >
          <SelectTrigger id="filter-target-type">
            <SelectValue placeholder={t("targetTypeAll")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("targetTypeAll")}</SelectItem>
            {TARGET_TYPES.map((targetType) => (
              <SelectItem key={targetType} value={targetType}>
                {targetType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-start-date" className="text-sm font-medium">
          {t("startDateLabel")}
        </label>
        <Input
          id="filter-start-date"
          type="date"
          value={value.start_date?.slice(0, 10) ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              start_date: e.target.value ? new Date(e.target.value).toISOString() : undefined,
            })
          }
        />
      </div>
    </div>
  );
}
