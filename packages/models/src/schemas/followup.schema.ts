import { z } from "zod";
import { recruiterSchema } from "./application.schema.js";
import { applicationStatusSchema } from "./hito.schema.js";

export const followupUrgencySchema = z.enum(["ok", "warn", "critical"]);

export const followupThresholdsSchema = z.object({
  warn: z.number().int().positive(),
  critical: z.number().int().positive(),
});

export const followupItemSchema = z.object({
  ramaId: z.uuid(),
  company: z.string().min(1),
  role: z.string().min(1),
  status: applicationStatusSchema,
  lastUpdated: z.iso.date(),
  daysSince: z.number().int().nonnegative(),
  urgency: followupUrgencySchema,
  recruiter: recruiterSchema.optional(),
});

export const followupSummarySchema = z.object({
  critical: z.number().int().nonnegative(),
  warn: z.number().int().nonnegative(),
  ok: z.number().int().nonnegative(),
});

export const followupListResponseSchema = z.object({
  items: z.array(followupItemSchema),
  summary: followupSummarySchema,
  thresholds: followupThresholdsSchema,
});

export const listFollowupsQuerySchema = z.object({
  threshold: z.coerce.number().int().positive().optional(),
});

export type FollowupUrgency = z.infer<typeof followupUrgencySchema>;
export type FollowupThresholds = z.infer<typeof followupThresholdsSchema>;
export type FollowupItem = z.infer<typeof followupItemSchema>;
export type FollowupSummary = z.infer<typeof followupSummarySchema>;
export type FollowupListResponse = z.infer<typeof followupListResponseSchema>;
export type ListFollowupsQuery = z.infer<typeof listFollowupsQuerySchema>;
