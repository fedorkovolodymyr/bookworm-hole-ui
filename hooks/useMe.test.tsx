// hooks/useMe.test.tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { AppQueryProvider } from "@/lib/query-client";
import { useMe } from "./useMe";

describe("useMe", () => {
  it("fetches the current user profile", async () => {
    const { result } = renderHook(() => useMe(), { wrapper: AppQueryProvider });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.username).toBe("alice");
  });
});
