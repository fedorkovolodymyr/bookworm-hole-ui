// hooks/useAdminUsers.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import * as adminUsersApi from "@/lib/api/admin-users";
import {
  useAdminUsers,
  useActivateUser,
  useDeactivateUser,
  usePromoteUser,
  useDemoteUser,
  useResetUserPassword,
} from "./useAdminUsers";

vi.mock("@/lib/api/admin-users");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAdminUsers hooks", () => {
  beforeEach(() => {
    vi.mocked(adminUsersApi.fetchAdminUsers).mockReset();
    vi.mocked(adminUsersApi.activateUser).mockReset();
    vi.mocked(adminUsersApi.deactivateUser).mockReset();
    vi.mocked(adminUsersApi.promoteUser).mockReset();
    vi.mocked(adminUsersApi.demoteUser).mockReset();
    vi.mocked(adminUsersApi.resetUserPassword).mockReset();
  });

  it("useAdminUsers fetches a page of users", async () => {
    const page = { items: [], total: 0, limit: 10, offset: 0 };
    vi.mocked(adminUsersApi.fetchAdminUsers).mockResolvedValue(page);

    const { result } = renderHook(() => useAdminUsers({ limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(page);
    expect(adminUsersApi.fetchAdminUsers).toHaveBeenCalledWith({ limit: 10 });
  });

  it("useActivateUser calls activateUser", async () => {
    vi.mocked(adminUsersApi.activateUser).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      username: "a",
      display_name: "A",
      is_active: true,
      is_admin: false,
    });

    const { result } = renderHook(() => useActivateUser(), { wrapper: createWrapper() });
    result.current.mutate("u1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminUsersApi.activateUser).toHaveBeenCalledWith("u1");
  });

  it("useDeactivateUser calls deactivateUser", async () => {
    vi.mocked(adminUsersApi.deactivateUser).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      username: "a",
      display_name: "A",
      is_active: false,
      is_admin: false,
    });

    const { result } = renderHook(() => useDeactivateUser(), { wrapper: createWrapper() });
    result.current.mutate("u1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminUsersApi.deactivateUser).toHaveBeenCalledWith("u1");
  });

  it("usePromoteUser calls promoteUser", async () => {
    vi.mocked(adminUsersApi.promoteUser).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      username: "a",
      display_name: "A",
      is_active: true,
      is_admin: true,
    });

    const { result } = renderHook(() => usePromoteUser(), { wrapper: createWrapper() });
    result.current.mutate("u1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminUsersApi.promoteUser).toHaveBeenCalledWith("u1");
  });

  it("useDemoteUser calls demoteUser", async () => {
    vi.mocked(adminUsersApi.demoteUser).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      username: "a",
      display_name: "A",
      is_active: true,
      is_admin: false,
    });

    const { result } = renderHook(() => useDemoteUser(), { wrapper: createWrapper() });
    result.current.mutate("u1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminUsersApi.demoteUser).toHaveBeenCalledWith("u1");
  });

  it("useResetUserPassword calls resetUserPassword", async () => {
    vi.mocked(adminUsersApi.resetUserPassword).mockResolvedValue({ reset_token: "tok" });

    const { result } = renderHook(() => useResetUserPassword(), { wrapper: createWrapper() });
    result.current.mutate("u1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminUsersApi.resetUserPassword).toHaveBeenCalledWith("u1");
  });
});
