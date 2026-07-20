import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { AppQueryProvider } from "@/lib/query-client";
import { LoginForm } from "./login-form";
import enMessages from "@/messages/en.json";

function renderLoginForm(onSuccess: () => void) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AppQueryProvider>
        <LoginForm onSuccess={onSuccess} />
      </AppQueryProvider>
    </NextIntlClientProvider>,
  );
}

describe("LoginForm", () => {
  it("submits email and password and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    renderLoginForm(onSuccess);

    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("shows a form-level error on failed login", async () => {
    const { server } = await import("@/tests/mocks/server");
    const { http, HttpResponse } = await import("msw");
    server.use(
      http.post("/api/auth/login", () =>
        HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 }),
      ),
    );

    renderLoginForm(vi.fn());

    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });
});
