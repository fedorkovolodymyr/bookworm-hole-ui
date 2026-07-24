"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/users", key: "users" },
  { href: "/admin/audit-logs", key: "auditLogs" },
  { href: "/admin/contributions", key: "contributions" },
  { href: "/admin/catalog-imports", key: "catalogImports" },
] as const;

export function AdminNav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <div className="border-border flex gap-4 border-b">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 border-transparent px-1 pb-2 text-sm",
              pathname.startsWith(tab.href)
                ? "border-primary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(tab.key)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
