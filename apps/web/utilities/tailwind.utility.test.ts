import { describe, expect, it } from "vitest";
import { cn } from "@/utilities/tailwind.utility";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy conditional inputs", () => {
    expect(cn("a", false && "b")).toBe("a");
  });

  it("resolves Tailwind conflicts by keeping the last class", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
