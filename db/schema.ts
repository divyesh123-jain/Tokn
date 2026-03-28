import { boolean, integer, timestamp, uuid, varchar, pgTable, unique } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("users_email_unique").on(t.email),
  ],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 200 }).notNull(),
    kind: varchar("kind", { length: 20 }).notNull().default("individual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("workspace_members_workspace_user_unique").on(t.workspaceId, t.userId),
  ],
);

export const motionTokens = pgTable(
  "motion_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    category: varchar("category", { length: 20 }).notNull(),
    durationMs: integer("duration_ms").notNull(),
    delayMs: integer("delay_ms").notNull(),
    easing: varchar("easing", { length: 200 }).notNull(),
    yOffset: integer("y_offset").notNull(),
    scaleStart: integer("scale_start").notNull(),
    opacityStart: integer("opacity_start").notNull(),
    isSpring: boolean("is_spring").notNull(),
    springStiffness: integer("spring_stiffness").notNull(),
    springDamping: integer("spring_damping").notNull(),
    springMass: integer("spring_mass").notNull(),
    deprecated: boolean("deprecated").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("motion_tokens_workspace_name_unique").on(t.workspaceId, t.name),
  ],
);

