import { describe, expect, it } from "vitest";
import { calculateDaysSince, calculateUrgency, DEFAULT_FOLLOWUP_THRESHOLDS, resolveThresholds, todayIsoDate } from "./followup.utils";

describe("calculateDaysSince", () => {
  it("returns 0 when the last update was today", () => {
    const now = new Date("2024-05-10T12:00:00.000Z");

    expect(calculateDaysSince("2024-05-10", now)).toBe(0);
  });

  it("returns the number of whole days elapsed", () => {
    const now = new Date("2024-05-20T12:00:00.000Z");

    expect(calculateDaysSince("2024-05-04", now)).toBe(16);
  });

  it("never returns a negative number for a future lastUpdated", () => {
    const now = new Date("2024-05-01T00:00:00.000Z");

    expect(calculateDaysSince("2024-05-10", now)).toBe(0);
  });
});

describe("calculateUrgency", () => {
  const thresholds = { warn: 7, critical: 15 };

  it("returns ok below the warn threshold", () => {
    expect(calculateUrgency(6, thresholds)).toBe("ok");
  });

  it("returns warn at the warn threshold", () => {
    expect(calculateUrgency(7, thresholds)).toBe("warn");
  });

  it("returns warn between the warn and critical thresholds", () => {
    expect(calculateUrgency(14, thresholds)).toBe("warn");
  });

  it("returns critical at the critical threshold", () => {
    expect(calculateUrgency(15, thresholds)).toBe("critical");
  });
});

describe("resolveThresholds", () => {
  it("falls back to the default thresholds when none is given", () => {
    expect(resolveThresholds(undefined)).toEqual(DEFAULT_FOLLOWUP_THRESHOLDS);
  });

  it("uses the given threshold as warn, keeping the default critical", () => {
    expect(resolveThresholds(10)).toEqual({ warn: 10, critical: 15 });
  });

  it("raises critical to match warn when warn exceeds the default critical", () => {
    expect(resolveThresholds(20)).toEqual({ warn: 20, critical: 20 });
  });
});

describe("todayIsoDate", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(todayIsoDate(new Date("2024-05-10T23:59:00.000Z"))).toBe("2024-05-10");
  });
});
