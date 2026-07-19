import { describe, expect, it } from "vitest";
import { isAxiosError } from "./errors";

describe("isAxiosError", () => {
  it("returns true for an object with a response property", () => {
    expect(isAxiosError({ response: { status: 404, data: { detail: "not found" } } })).toBe(true);
  });

  it("returns false for a plain Error", () => {
    expect(isAxiosError(new Error("boom"))).toBe(false);
  });

  it("returns false for null", () => {
    expect(isAxiosError(null)).toBe(false);
  });

  it("returns false for a primitive", () => {
    expect(isAxiosError("some string")).toBe(false);
  });
});
