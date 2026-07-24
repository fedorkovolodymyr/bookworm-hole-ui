import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { AuditLogTable } from "./audit-log-table";
import type { AuditLogResponse } from "@/lib/api/types";

const logs: AuditLogResponse[] = [
  {
    id: "l1",
    actor_id: "u1",
    action: "promote_user",
    target_type: "user",
    target_id: "u2",
    audit_metadata: {},
    ip_address: "127.0.0.1",
    created_at: "2026-07-24T10:00:00Z",
  },
];

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("AuditLogTable", () => {
  it("renders a row per log entry with translated action and target type", () => {
    renderWithIntl(<AuditLogTable logs={logs} />);
    expect(screen.getByText("Promoted user")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();
    expect(screen.getByText("u2")).toBeInTheDocument();
  });

  it("shows an empty state when there are no logs", () => {
    renderWithIntl(<AuditLogTable logs={[]} />);
    expect(screen.getByText("No audit log entries found.")).toBeInTheDocument();
  });
});
