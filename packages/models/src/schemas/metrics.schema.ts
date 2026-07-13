import { z } from "zod";
import { applicationStatusSchema } from "./hito.schema.js";

export const profileRoiSchema = z.object({
  cvVersionId: z.uuid(),
  applications: z.number().int().nonnegative(),
  interviews: z.number().int().nonnegative(),
  roi: z.number().nonnegative(),
});

export const conversionSchema = z.object({
  stage: applicationStatusSchema,
  count: z.number().int().nonnegative(),
  conversionRate: z.number().min(0).max(1),
});

export const techHeatmapSchema = z.object({
  technology: z.string().min(1),
  applications: z.number().int().nonnegative(),
  rejections: z.number().int().nonnegative(),
  advances: z.number().int().nonnegative(),
});

export const skillGapSchema = z.object({
  skill: z.string().min(1),
  missingCount: z.number().int().nonnegative(),
});

export const userStatsSchema = z.object({
  roiGlobal: z.number().nonnegative(),
  gapHabilidades: z.array(z.string()),
});

export type ProfileRoi = z.infer<typeof profileRoiSchema>;
export type Conversion = z.infer<typeof conversionSchema>;
export type TechHeatmap = z.infer<typeof techHeatmapSchema>;
export type SkillGap = z.infer<typeof skillGapSchema>;
export type UserStats = z.infer<typeof userStatsSchema>;
