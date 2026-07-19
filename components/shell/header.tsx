import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export function Header() {
  return (
    <header className="border-border flex h-16 items-center justify-between border-b px-4 sm:px-6">
      <Link href="/" className="text-lg font-semibold">
        Bookworm Hole
      </Link>
      <nav className="hidden items-center gap-6 sm:flex">
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
          Browse
        </Link>
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
          Collections
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button size="sm">Sign in</Button>
      </div>
    </header>
  );
}
