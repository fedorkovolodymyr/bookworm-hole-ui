// lib/api/admin-users.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import {
  fetchAdminUsers,
  activateUser,
  deactivateUser,
  promoteUser,
  demoteUser,
  resetUserPassword,
} from "./admin-users";

vi.mock("./client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

describe("admin-users API client", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
  });

  it("fetches paginated admin users with params", async () => {
    const page = { items: [], total: 0, limit: 10, offset: 0 };
    vi.mocked(apiClient.get).mockResolvedValue({ data: page });

    const result = await fetchAdminUsers({ limit: 10, email: "a@b.com" });

    expect(apiClient.get).toHaveBeenCalledWith("/admin/users/", {
      params: { limit: 10, email: "a@b.com" },
    });
    expect(result).toEqual(page);
  });

  it("activates a user", async () => {
    const user = { id: "u1", is_active: true };
    vi.mocked(apiClient.post).mockResolvedValue({ data: user });

    const result = await activateUser("u1");

    expect(apiClient.post).toHaveBeenCalledWith("/admin/users/u1/activate");
    expect(result).toEqual(user);
  });

  it("deactivates a user", async () => {
    const user = { id: "u1", is_active: false };
    vi.mocked(apiClient.post).mockResolvedValue({ data: user });

    const result = await deactivateUser("u1");

    expect(apiClient.post).toHaveBeenCalledWith("/admin/users/u1/deactivate");
    expect(result).toEqual(user);
  });

  it("promotes a user", async () => {
    const user = { id: "u1", is_admin: true };
    vi.mocked(apiClient.post).mockResolvedValue({ data: user });

    const result = await promoteUser("u1");

    expect(apiClient.post).toHaveBeenCalledWith("/admin/users/u1/promote");
    expect(result).toEqual(user);
  });

  it("demotes a user", async () => {
    const user = { id: "u1", is_admin: false };
    vi.mocked(apiClient.post).mockResolvedValue({ data: user });

    const result = await demoteUser("u1");

    expect(apiClient.post).toHaveBeenCalledWith("/admin/users/u1/demote");
    expect(result).toEqual(user);
  });

  it("resets a user's password and returns the reset token", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { reset_token: "tok123" } });

    const result = await resetUserPassword("u1");

    expect(apiClient.post).toHaveBeenCalledWith("/admin/users/u1/password-reset");
    expect(result).toEqual({ reset_token: "tok123" });
  });
});
