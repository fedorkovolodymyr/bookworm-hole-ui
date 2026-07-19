import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./dialog";

describe("Dialog", () => {
  it("does not show content until triggered", () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Hidden Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByText("Hidden Title")).not.toBeInTheDocument();
  });

  it("shows content after trigger is clicked", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Visible Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(await screen.findByText("Visible Title")).toBeInTheDocument();
  });
});
