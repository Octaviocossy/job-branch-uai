import { boolean, date, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { cvVersions } from "./cv-versions.schema";
import { users } from "./users.schema";
import { vacantes } from "./vacantes.schema";

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => users.id),
  vacanteId: uuid("vacante_id")
    .notNull()
    .references(() => vacantes.id),
  cvVersionId: uuid("cv_version_id")
    .notNull()
    .references(() => cvVersions.id),
  status: text("status").notNull(),
  appliedDate: date("applied_date").notNull(),
  lastUpdated: date("last_updated").notNull(),
  recruiterName: text("recruiter_name"),
  recruiterLinkedin: text("recruiter_linkedin"),
  recruiterEmail: text("recruiter_email"),
  techStack: text("tech_stack").array().notNull().default([]),
  notes: text("notes"),
  salary: text("salary"),
  location: text("location"),
  source: text("source"),
  archived: boolean("archived").notNull().default(false),
});
