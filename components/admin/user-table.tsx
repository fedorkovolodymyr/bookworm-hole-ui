"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useActivateUser,
  useDeactivateUser,
  useDemoteUser,
  usePromoteUser,
} from "@/hooks/useAdminUsers";
import type { AdminUserResponse } from "@/lib/api/types";

export function UserTable({
  users,
  onResetPassword,
}: {
  users: AdminUserResponse[];
  onResetPassword: (userId: string) => void;
}) {
  const t = useTranslations("admin.users");
  const activate = useActivateUser();
  const deactivate = useDeactivateUser();
  const promote = usePromoteUser();
  const demote = useDemoteUser();

  if (users.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted-foreground border-border border-b text-left">
          <th className="py-2 font-medium">{t("table.email")}</th>
          <th className="py-2 font-medium">{t("table.username")}</th>
          <th className="py-2 font-medium">{t("table.displayName")}</th>
          <th className="py-2 font-medium">{t("table.status")}</th>
          <th className="py-2 font-medium">{t("table.role")}</th>
          <th className="py-2 font-medium">{t("table.actions")}</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} className="border-border border-b last:border-b-0">
            <td className="py-2">{user.email}</td>
            <td className="py-2">{user.username}</td>
            <td className="py-2">{user.display_name}</td>
            <td className="py-2">
              <Badge variant={user.is_active ? "secondary" : "outline"}>
                {user.is_active ? t("table.activeBadge") : t("table.inactiveBadge")}
              </Badge>
            </td>
            <td className="py-2">
              {user.is_admin && <Badge variant="secondary">{t("table.adminBadge")}</Badge>}
            </td>
            <td className="py-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="sm">
                      {t("table.actions")}
                    </Button>
                  }
                />
                <DropdownMenuContent>
                  {user.is_active ? (
                    <DropdownMenuItem onClick={() => deactivate.mutate(user.id)}>
                      {t("actions.deactivate")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => activate.mutate(user.id)}>
                      {t("actions.activate")}
                    </DropdownMenuItem>
                  )}
                  {user.is_admin ? (
                    <DropdownMenuItem onClick={() => demote.mutate(user.id)}>
                      {t("actions.demote")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => promote.mutate(user.id)}>
                      {t("actions.promote")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onResetPassword(user.id)}>
                    {t("actions.resetPassword")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
