import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import * as adminAuditLogsApi from "@/lib/api/admin-audit-logs";
import { useAdminAuditLogs } from "./useAdminAuditLogs";

vi.mock("@/lib/api/admin-audit-logs");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe("useAdminAuditLogs", () => {
  beforeEach(() => {
    vi.mocked(adminAuditLogsApi.fetchAuditLogs).mockReset();
  });

  it("fetches a page of audit logs with params", async () => {
    const page = { items: [], total: 0, limit: 10, offset: 0 };
    vi.mocked(adminAuditLogsApi.fetchAuditLogs).mockResolvedValue(page);

    const { result } = renderHook(() => useAdminAuditLogs({ action: "promote_user" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(page);
    expect(adminAuditLogsApi.fetchAuditLogs).toHaveBeenCalledWith({ action: "promote_user" });
  });
});
