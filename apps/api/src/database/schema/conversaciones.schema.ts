import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications.schema";

export const conversaciones = pgTable("conversaciones", {
  id: uuid("id").primaryKey().defaultRandom(),

  applicationId: uuid("application_id")
    .notNull()
    .unique()
    .references(() => applications.id, { onDelete: "cascade" }),

  createdAt: timestamp("created_at").notNull().defaultNow(),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
