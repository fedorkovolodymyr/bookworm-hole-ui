import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "./pagination";

describe("Pagination", () => {
  it("renders page links", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
