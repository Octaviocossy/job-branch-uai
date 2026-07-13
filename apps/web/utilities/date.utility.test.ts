import { describe, expect, it } from "vitest";
import { differenceInDays } from "@/utilities/date.utility";

describe("differenceInDays", () => {
  it("returns the number of days between two dates", () => {
    expect(differenceInDays(new Date("2024-05-01"), new Date("2024-04-28"))).toBe(3);
  });

  it("is order-independent", () => {
    expect(differenceInDays(new Date("2024-04-28"), new Date("2024-05-01"))).toBe(3);
  });

  it("returns 0 for the same date", () => {
    expect(differenceInDays(new Date("2024-05-01"), new Date("2024-05-01"))).toBe(0);
  });
});
