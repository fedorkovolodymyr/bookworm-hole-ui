// hooks/useAuth.test.tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { AppQueryProvider } from "@/lib/query-client";
import { useLogin, useLogout, useRegister } from "./useAuth";

describe("useAuth", () => {
  it("useRegister calls the register endpoint and resolves the user", async () => {
    const { result } = renderHook(() => useRegister(), { wrapper: AppQueryProvider });
    result.current.mutate({
      email: "a@b.com",
      username: "alice",
      password: "pw",
      display_name: "Alice",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.user.username).toBe("alice");
  });

  it("useLogin calls the login endpoint and resolves the user", async () => {
    const { result } = renderHook(() => useLogin(), { wrapper: AppQueryProvider });
    result.current.mutate({ email: "a@b.com", password: "pw" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.user.username).toBe("alice");
  });

  it("useLogout resolves without error", async () => {
    const { result } = renderHook(() => useLogout(), { wrapper: AppQueryProvider });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
