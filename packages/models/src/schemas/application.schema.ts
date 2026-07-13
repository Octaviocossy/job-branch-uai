import { z } from "zod";
import { applicationStatusSchema, hitoSchema } from "./hito.schema";

export const recruiterSchema = z.object({
  name: z.string().min(1),
  linkedin: z.string().optional(),
  email: z.email().optional(),
});

export const applicationSchema = z.object({
  id: z.uuid(),
  company: z.string().min(1),
  role: z.string().min(1),
  status: applicationStatusSchema,
  cvVersion: z.string().min(1),
  appliedDate: z.iso.date(),
  lastUpdated: z.iso.date(),
  recruiter: recruiterSchema.optional(),
  techStack: z.array(z.string()),
  notes: z.string().optional(),
  salary: z.string().optional(),
  location: z.string().optional(),
  source: z.string().optional(),
  archived: z.boolean().optional(),
  timeline: z.array(hitoSchema),
});

export const createApplicationSchema = applicationSchema.omit({ id: true, timeline: true, lastUpdated: true });

export type Recruiter = z.infer<typeof recruiterSchema>;
export type Application = z.infer<typeof applicationSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
