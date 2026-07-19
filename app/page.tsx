import { AppShell } from "@/components/shell/app-shell";

export default function Home() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Bookworm Hole</h1>
      <p className="text-muted-foreground mt-2">Track, review, and discover books.</p>
    </AppShell>
  );
}
