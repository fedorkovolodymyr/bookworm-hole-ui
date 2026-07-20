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

export function Header() {
  const { data: me } = useMe();
  const logout = useLogout();
  const t = useTranslations("catalog.myContributions");

  return (
    <header className="border-border flex h-16 items-center justify-between border-b px-4 sm:px-6">
      <Link href="/" className="text-lg font-semibold">
        Bookworm Hole
      </Link>
      <nav className="hidden items-center gap-6 sm:flex">
        <Link href="/books" className="text-muted-foreground hover:text-foreground text-sm">
          Browse
        </Link>
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
          Collections
        </Link>
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
              <DropdownMenuItem render={<Link href="/profile" />}>Profile</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/contributions" />}>
                {t("navLink")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => logout.mutate()}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" nativeButton={false} render={<Link href="/login" />}>
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
}
