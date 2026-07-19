import * as React from "react";
import { Header } from "@/components/shell/header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
