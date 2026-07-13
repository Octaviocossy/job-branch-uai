import { describe, expect, it } from "vitest";
import type { AnalyticsApplicationRow } from "../domain/analytics-read.repository";
import { computeTechCounts, foldConversion, foldProfileRoi, foldSkillGaps, foldSourceDistribution, foldTechHeatmap, foldUserStats, heatmapScore } from "./analytics.folds";

function row(overrides: Partial<AnalyticsApplicationRow>): AnalyticsApplicationRow {
  return {
    id: "app-1",
    cvVersionId: "cv-1",
    status: "Enviado",
    techStack: [],
    source: null,
    hitoStatuses: [],
    ...overrides,
  };
}

describe("foldConversion", () => {
  it("cumulates a later-stage application into every earlier funnel stage", () => {
    const rows = [row({ id: "a", status: "Oferta", hitoStatuses: ["Enviado", "RRHH", "Entrevista Técnica", "Oferta"] })];

    const result = foldConversion(rows);

    expect(result).toEqual([
      { stage: "Enviado", count: 1, conversionRate: 1 },
      { stage: "RRHH", count: 1, conversionRate: 1 },
      { stage: "Entrevista Técnica", count: 1, conversionRate: 1 },
      { stage: "Oferta", count: 1, conversionRate: 1 },
    ]);
  });

  it("does not count a stage that was never reached", () => {
    const rows = [row({ id: "a", status: "Enviado" }), row({ id: "b", status: "RRHH", hitoStatuses: ["Enviado", "RRHH"] })];

    const result = foldConversion(rows);

    expect(result.find((c) => c.stage === "Enviado")).toEqual({ stage: "Enviado", count: 2, conversionRate: 1 });
    expect(result.find((c) => c.stage === "RRHH")).toEqual({ stage: "RRHH", count: 1, conversionRate: 0.5 });
    expect(result.find((c) => c.stage === "Oferta")).toEqual({ stage: "Oferta", count: 0, conversionRate: 0 });
  });

  it("returns zeroed rates for an empty pipeline", () => {
    expect(foldConversion([])).toEqual([
      { stage: "Enviado", count: 0, conversionRate: 0 },
      { stage: "RRHH", count: 0, conversionRate: 0 },
      { stage: "Entrevista Técnica", count: 0, conversionRate: 0 },
      { stage: "Oferta", count: 0, conversionRate: 0 },
    ]);
  });
});

describe("foldProfileRoi", () => {
  it("sorts CV versions with the best ROI first", () => {
    const rows = [
      row({ id: "a", cvVersionId: "cv-low", status: "Enviado" }),
      row({ id: "b", cvVersionId: "cv-low", status: "Enviado" }),
      row({ id: "c", cvVersionId: "cv-high", status: "Entrevista Técnica", hitoStatuses: ["Entrevista Técnica"] }),
    ];

    const result = foldProfileRoi(rows, ["cv-low", "cv-high"]);

    expect(result[0]).toEqual({ cvVersionId: "cv-high", applications: 1, interviews: 1, roi: 1 });
    expect(result[1]).toEqual({ cvVersionId: "cv-low", applications: 2, interviews: 0, roi: 0 });
  });

  it("includes CV versions with zero applications at roi 0", () => {
    const result = foldProfileRoi([], ["cv-unused"]);

    expect(result).toEqual([{ cvVersionId: "cv-unused", applications: 0, interviews: 0, roi: 0 }]);
  });
});

describe("computeTechCounts / heatmapScore", () => {
  it("counts applications, rejections, and advances per technology", () => {
    const rows = [
      row({ id: "a", techStack: ["React"], status: "Rechazado" }),
      row({ id: "b", techStack: ["React"], status: "Oferta" }),
      row({ id: "c", techStack: ["React"], status: "Enviado" }),
    ];

    const counts = computeTechCounts(rows);
    const expected = { technology: "React", applications: 3, rejections: 1, advances: 1 };

    expect(counts).toEqual([expected]);
    expect(heatmapScore(expected)).toBe(0);
  });

  it("scores a technology negative when rejections outweigh advances", () => {
    const entry = { technology: "Java", applications: 3, rejections: 2, advances: 1 };

    expect(heatmapScore(entry)).toBe(-1);
  });
});

describe("foldTechHeatmap", () => {
  it("sorts by rejections descending and caps at topN", () => {
    const rows = [
      row({ id: "a", techStack: ["Java"], status: "Rechazado" }),
      row({ id: "b", techStack: ["Java"], status: "Rechazado" }),
      row({ id: "c", techStack: ["React"], status: "Rechazado" }),
    ];

    const result = foldTechHeatmap(rows, 1);

    expect(result).toEqual([{ technology: "Java", applications: 2, rejections: 2, advances: 0 }]);
  });
});

describe("foldSkillGaps", () => {
  it("flags technologies where rejections exceed advances", () => {
    const rows = [
      row({ id: "a", techStack: ["Java"], status: "Rechazado" }),
      row({ id: "b", techStack: ["Java"], status: "Rechazado" }),
      row({ id: "c", techStack: ["Java"], status: "Oferta" }),
      row({ id: "d", techStack: ["React"], status: "Oferta" }),
    ];

    expect(foldSkillGaps(rows)).toEqual([{ skill: "Java", missingCount: 2 }]);
  });
});

describe("foldSourceDistribution", () => {
  it("groups applications by source, defaulting missing sources to Otro", () => {
    const rows = [row({ id: "a", source: "LinkedIn" }), row({ id: "b", source: "LinkedIn" }), row({ id: "c", source: null })];

    expect(foldSourceDistribution(rows)).toEqual([
      { source: "LinkedIn", count: 2 },
      { source: "Otro", count: 1 },
    ]);
  });
});

describe("foldUserStats", () => {
  it("aggregates global ROI and skill gaps across the pipeline", () => {
    const rows = [
      row({ id: "a", techStack: ["Java"], status: "Rechazado" }),
      row({ id: "b", techStack: ["Java"], status: "Rechazado" }),
      row({ id: "c", status: "Entrevista Técnica", hitoStatuses: ["Entrevista Técnica"] }),
      row({ id: "d", status: "Enviado" }),
    ];

    expect(foldUserStats(rows)).toEqual({ roiGlobal: 0.25, gapHabilidades: ["Java"] });
  });

  it("returns zeroed stats for an empty pipeline", () => {
    expect(foldUserStats([])).toEqual({ roiGlobal: 0, gapHabilidades: [] });
  });
});
