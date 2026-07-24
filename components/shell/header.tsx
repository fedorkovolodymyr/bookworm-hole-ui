"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { LocaleSwitcher } from "@/components/shell/locale-switcher";
import { useMe } from "@/hooks/useMe";
import { useLogout } from "@/hooks/useAuth";
import { useThreads } from "@/hooks/useChat";

export function Header() {
  const { data: me } = useMe();
  const logout = useLogout();
  const threads = useThreads();
  const t = useTranslations("catalog.myContributions");
  const tShell = useTranslations("shell");

  const unreadCount =
    me && threads.data
      ? threads.data.filter(
          (thread) =>
            thread.last_message &&
            thread.last_message.sender_id !== me.id &&
            thread.last_message.read_at === null,
        ).length
      : 0;

  return (
    <header className="border-border flex h-16 items-center justify-between border-b px-4 sm:px-6">
      <Link href="/" className="text-lg font-semibold">
        Bookworm Hole
      </Link>
      <nav className="hidden items-center gap-6 sm:flex">
        <Link href="/books" className="text-muted-foreground hover:text-foreground text-sm">
          {tShell("nav.browse")}
        </Link>
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
          {tShell("nav.collections")}
        </Link>
        <Link href="/reading" className="text-muted-foreground hover:text-foreground text-sm">
          {tShell("nav.reading")}
        </Link>
        <Link href="/friends" className="text-muted-foreground hover:text-foreground text-sm">
          {tShell("nav.friends")}
        </Link>
        <Link href="/chat" className="text-muted-foreground hover:text-foreground text-sm">
          {tShell("nav.chat")}
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 py-0.5 text-xs">
              {unreadCount}
            </span>
          )}
        </Link>
        {me?.is_admin && (
          <Link href="/admin/users" className="text-muted-foreground hover:text-foreground text-sm">
            {tShell("nav.admin")}
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
        {me ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="size-6">
                    <AvatarFallback>{me.display_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {me.display_name}
                </Button>
              }
            />
            <DropdownMenuContent>
              <DropdownMenuItem render={<Link href="/profile" />}>
                {tShell("userMenu.profile")}
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/contributions" />}>
                {t("navLink")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => logout.mutate()}>
                {tShell("userMenu.logOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" nativeButton={false} render={<Link href="/login" />}>
            {tShell("signIn")}
          </Button>
        )}
      </div>
    </header>
  );
}
