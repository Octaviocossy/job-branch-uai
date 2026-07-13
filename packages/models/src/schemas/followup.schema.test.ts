import { describe, expect, it } from "vitest";
import {
  followupItemSchema,
  followupListResponseSchema,
  followupSummarySchema,
  followupThresholdsSchema,
  followupUrgencySchema,
  listFollowupsQuerySchema,
} from "./followup.schema";

const validItem = {
  ramaId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  company: "Mercado Libre",
  role: "Senior Frontend Engineer",
  status: "Entrevista Técnica",
  lastUpdated: "2024-05-04",
  daysSince: 12,
  urgency: "warn",
};

describe("followupUrgencySchema", () => {
  it("accepts every documented urgency", () => {
    for (const urgency of ["ok", "warn", "critical"]) {
      expect(followupUrgencySchema.safeParse(urgency).success).toBe(true);
    }
  });

  it("rejects an unknown urgency", () => {
    expect(followupUrgencySchema.safeParse("panic").success).toBe(false);
  });
});

describe("followupThresholdsSchema", () => {
  it("parses valid positive thresholds", () => {
    expect(followupThresholdsSchema.parse({ warn: 7, critical: 15 })).toEqual({ warn: 7, critical: 15 });
  });

  it("rejects a non-positive threshold", () => {
    expect(followupThresholdsSchema.safeParse({ warn: 0, critical: 15 }).success).toBe(false);
  });
});

describe("followupItemSchema", () => {
  it("parses a valid item unchanged", () => {
    expect(followupItemSchema.parse(validItem)).toEqual(validItem);
  });

  it("parses an item with a recruiter", () => {
    const withRecruiter = { ...validItem, recruiter: { name: "Laura García", email: "l.garcia@meli.com" } };

    expect(followupItemSchema.parse(withRecruiter)).toEqual(withRecruiter);
  });

  it("rejects a negative daysSince", () => {
    const result = followupItemSchema.safeParse({ ...validItem, daysSince: -1 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("daysSince");
    }
  });

  it("rejects an invalid status", () => {
    expect(followupItemSchema.safeParse({ ...validItem, status: "En Pausa" }).success).toBe(false);
  });
});

describe("followupSummarySchema", () => {
  it("parses valid non-negative counts", () => {
    expect(followupSummarySchema.parse({ critical: 1, warn: 2, ok: 3 })).toEqual({ critical: 1, warn: 2, ok: 3 });
  });

  it("rejects a negative count", () => {
    expect(followupSummarySchema.safeParse({ critical: -1, warn: 0, ok: 0 }).success).toBe(false);
  });
});

describe("followupListResponseSchema", () => {
  it("parses a full response", () => {
    const response = {
      items: [validItem],
      summary: { critical: 0, warn: 1, ok: 0 },
      thresholds: { warn: 7, critical: 15 },
    };

    expect(followupListResponseSchema.parse(response)).toEqual(response);
  });
});

describe("listFollowupsQuerySchema", () => {
  it("coerces a string threshold into a number", () => {
    expect(listFollowupsQuerySchema.parse({ threshold: "10" })).toEqual({ threshold: 10 });
  });

  it("allows an absent threshold", () => {
    expect(listFollowupsQuerySchema.parse({})).toEqual({});
  });

  it("rejects a non-positive threshold", () => {
    expect(listFollowupsQuerySchema.safeParse({ threshold: "0" }).success).toBe(false);
  });
});
