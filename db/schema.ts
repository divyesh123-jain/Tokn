import { boolean, integer, timestamp, uuid, varchar, text, pgTable, unique, pgEnum } from "drizzle-orm/pg-core";

export const workspaceMemberRoleEnum = pgEnum('workspace_member_role', [
  'owner',
  'editor',
  'viewer'
]);

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
    slug: varchar("slug", { length: 120 }).notNull(),
    kind: varchar("kind", { length: 20 }).notNull().default("individual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("workspaces_slug_unique").on(t.slug),
  ],
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
    role: workspaceMemberRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("workspace_members_workspace_user_unique").on(t.workspaceId, t.userId),
  ],
);

export const workspaceInvites = pgTable(
  "workspace_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    role: workspaceMemberRoleEnum("role").notNull(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    declinedAt: timestamp("declined_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("workspace_invites_workspace_email_unique").on(t.workspaceId, t.email),
    unique("workspace_invites_token_unique").on(t.token),
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
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedVersion: text("published_version"),
    deprecated: boolean("deprecated").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    unique("motion_tokens_workspace_name_unique").on(t.workspaceId, t.name),
  ],
);

