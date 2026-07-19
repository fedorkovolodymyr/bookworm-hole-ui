import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardContent, CardTitle } from "./card";

describe("Card", () => {
  it("renders title and content", () => {
    render(
      <Card>
        <CardTitle>My Title</CardTitle>
        <CardContent>My content</CardContent>
      </Card>,
    );
    expect(screen.getByText("My Title")).toBeInTheDocument();
    expect(screen.getByText("My content")).toBeInTheDocument();
  });
});
