import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { AppQueryProvider } from "@/lib/query-client";
import {
  useCancelDeletion,
  useChangePassword,
  useDeactivateAccount,
  useScheduleDeletion,
  useUpdateProfile,
} from "./useProfile";

describe("useProfile", () => {
  it("useUpdateProfile resolves the updated profile", async () => {
    const { result } = renderHook(() => useUpdateProfile(), { wrapper: AppQueryProvider });
    result.current.mutate({ display_name: "New Name" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.display_name).toBe("New Name");
  });

  it("useChangePassword resolves without error", async () => {
    const { result } = renderHook(() => useChangePassword(), { wrapper: AppQueryProvider });
    result.current.mutate({ current_password: "old", new_password: "new" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useScheduleDeletion sets deletion_scheduled_at", async () => {
    const { result } = renderHook(() => useScheduleDeletion(), { wrapper: AppQueryProvider });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.deletion_scheduled_at).toBeTruthy();
  });

  it("useCancelDeletion clears deletion_scheduled_at", async () => {
    const { result } = renderHook(() => useCancelDeletion(), { wrapper: AppQueryProvider });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.deletion_scheduled_at).toBeNull();
  });

  it("useDeactivateAccount sets is_active to false", async () => {
    const { result } = renderHook(() => useDeactivateAccount(), { wrapper: AppQueryProvider });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.is_active).toBe(false);
  });
});
