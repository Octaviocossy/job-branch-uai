import { describe, expect, it } from "vitest";
import { analyticsOverviewSchema, conversionSchema, profileRoiSchema, skillGapSchema, sourceDistributionSchema, techHeatmapSchema, userStatsSchema } from "./metrics.schema.js";

describe("profileRoiSchema", () => {
  const valid = { cvVersionId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301", applications: 12, interviews: 3, roi: 0.25 };

  it("parses a valid profile ROI entry", () => {
    expect(profileRoiSchema.parse(valid)).toEqual(valid);
  });

  it("rejects a negative roi", () => {
    expect(profileRoiSchema.safeParse({ ...valid, roi: -0.1 }).success).toBe(false);
  });

  it("rejects a non-UUID cvVersionId", () => {
    expect(profileRoiSchema.safeParse({ ...valid, cvVersionId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("conversionSchema", () => {
  const valid = { stage: "Entrevista Técnica", count: 5, conversionRate: 0.4 };

  it("parses a valid conversion entry", () => {
    expect(conversionSchema.parse(valid)).toEqual(valid);
  });

  it("rejects an invalid stage", () => {
    expect(conversionSchema.safeParse({ ...valid, stage: "Desconocido" }).success).toBe(false);
  });

  it("rejects a conversionRate above 1", () => {
    expect(conversionSchema.safeParse({ ...valid, conversionRate: 1.5 }).success).toBe(false);
  });
});

describe("techHeatmapSchema", () => {
  const valid = { technology: "Java", applications: 8, rejections: 5, advances: 3 };

  it("parses a valid heatmap entry", () => {
    expect(techHeatmapSchema.parse(valid)).toEqual(valid);
  });

  it("rejects an empty technology", () => {
    expect(techHeatmapSchema.safeParse({ ...valid, technology: "" }).success).toBe(false);
  });
});

describe("skillGapSchema", () => {
  const valid = { skill: "Java", missingCount: 4 };

  it("parses a valid skill gap entry", () => {
    expect(skillGapSchema.parse(valid)).toEqual(valid);
  });

  it("rejects a negative missingCount", () => {
    expect(skillGapSchema.safeParse({ ...valid, missingCount: -1 }).success).toBe(false);
  });
});

describe("userStatsSchema", () => {
  const valid = { roiGlobal: 0.35, gapHabilidades: ["Java", "Kubernetes"] };

  it("parses valid user stats", () => {
    expect(userStatsSchema.parse(valid)).toEqual(valid);
  });

  it("rejects a negative roiGlobal", () => {
    expect(userStatsSchema.safeParse({ ...valid, roiGlobal: -0.1 }).success).toBe(false);
  });
});

describe("sourceDistributionSchema", () => {
  const valid = { source: "LinkedIn", count: 7 };

  it("parses a valid source distribution entry", () => {
    expect(sourceDistributionSchema.parse(valid)).toEqual(valid);
  });

  it("rejects an empty source", () => {
    expect(sourceDistributionSchema.safeParse({ ...valid, source: "" }).success).toBe(false);
  });

  it("rejects a negative count", () => {
    expect(sourceDistributionSchema.safeParse({ ...valid, count: -1 }).success).toBe(false);
  });
});

describe("analyticsOverviewSchema", () => {
  const valid = {
    conversion: [{ stage: "Enviado", count: 10, conversionRate: 1 }],
    roi: [{ cvVersionId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301", applications: 10, interviews: 3, roi: 0.3 }],
    heatmap: [{ technology: "Java", applications: 8, rejections: 5, advances: 3 }],
    gaps: [{ skill: "Java", missingCount: 4 }],
    sources: [{ source: "LinkedIn", count: 7 }],
    stats: { roiGlobal: 0.35, gapHabilidades: ["Java"] },
  };

  it("parses a valid analytics overview", () => {
    expect(analyticsOverviewSchema.parse(valid)).toEqual(valid);
  });

  it("rejects an overview with an invalid nested conversion stage", () => {
    expect(
      analyticsOverviewSchema.safeParse({
        ...valid,
        conversion: [{ stage: "Desconocido", count: 10, conversionRate: 1 }],
      }).success,
    ).toBe(false);
  });
});
