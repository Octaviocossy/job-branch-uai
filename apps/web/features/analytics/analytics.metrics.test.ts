import { describe, expect, it } from "vitest";
import { conversionRateFor, formatPercent, toCvRoiBars, toFunnelBars, toSourceSlices } from "./analytics.metrics";

describe("formatPercent", () => {
  it("rounds a 0..1 rate to a whole percentage string", () => {
    expect(formatPercent(0.256)).toBe("26%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(1)).toBe("100%");
  });
});

describe("toFunnelBars", () => {
  it("maps conversion entries to funnel bars with a whole-number pct", () => {
    const bars = toFunnelBars([
      { stage: "Enviado", count: 10, conversionRate: 1 },
      { stage: "Oferta", count: 3, conversionRate: 0.3 },
    ]);

    expect(bars).toEqual([
      { stage: "Enviado", count: 10, pct: 100 },
      { stage: "Oferta", count: 3, pct: 30 },
    ]);
  });
});

describe("conversionRateFor", () => {
  it("finds the rate for a known stage", () => {
    const conversion = [
      { stage: "Enviado" as const, count: 10, conversionRate: 1 },
      { stage: "Oferta" as const, count: 3, conversionRate: 0.3 },
    ];

    expect(conversionRateFor(conversion, "Oferta")).toBe(0.3);
  });

  it("returns 0 for a stage that is not present", () => {
    expect(conversionRateFor([], "Oferta")).toBe(0);
  });
});

describe("toSourceSlices", () => {
  it("renames source/count into recharts-friendly name/value pairs", () => {
    expect(toSourceSlices([{ source: "LinkedIn", count: 5 }])).toEqual([{ name: "LinkedIn", value: 5 }]);
  });
});

describe("toCvRoiBars", () => {
  it("sorts by roi descending and derives a short label + whole-number pct", () => {
    const bars = toCvRoiBars([
      { cvVersionId: "11111111-aaaa-bbbb-cccc-111111111111", applications: 4, interviews: 1, roi: 0.25 },
      { cvVersionId: "22222222-aaaa-bbbb-cccc-222222222222", applications: 2, interviews: 2, roi: 1 },
    ]);

    expect(bars).toEqual([
      { cvVersionId: "22222222-aaaa-bbbb-cccc-222222222222", label: "CV 22222222", applications: 2, interviews: 2, pct: 100 },
      { cvVersionId: "11111111-aaaa-bbbb-cccc-111111111111", label: "CV 11111111", applications: 4, interviews: 1, pct: 25 },
    ]);
  });
});
