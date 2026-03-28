import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { motionTokens, workspaceMembers, workspaces } from "@/db/schema";
import { getSessionUser } from "@/lib/auth-helpers";
import { initialMotionTokens } from "@/lib/motif";
import { motionTokenItemToDbFields } from "@/lib/token-db";

const DEFAULT_TOKEN_NAMES = [
  "enter.fast",
  "enter.default",
  "enter.slow",
  "exit.fast",
  "exit.default",
  "spring.bouncy",
  "spring.gentle",
  "feedback.success",
];

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
  kind: z.enum(["individual", "team"]),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      kind: workspaces.kind,
      createdAt: workspaces.createdAt,
      role: workspaceMembers.role,
    })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, user.userId))
    .orderBy(desc(workspaces.createdAt));

  return NextResponse.json({
    workspaces: rows.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      createdAt: r.createdAt.toISOString(),
      role: r.role,
    })),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createWorkspaceSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { name, kind } = parsed.data;
  const db = getDb();
  const now = new Date();

  const insertedWorkspaces = await db
    .insert(workspaces)
    .values({ name, kind, createdAt: now })
    .returning();

  const workspaceId = insertedWorkspaces[0].id;

  await db.insert(workspaceMembers).values({
    workspaceId,
    userId: user.userId,
    role: "owner",
    createdAt: now,
  });

  const defaultTokens = initialMotionTokens.filter((t) => DEFAULT_TOKEN_NAMES.includes(t.name));
  const tokenRows = defaultTokens.map((t) => {
    const { id: _id, ...rest } = t;
    return {
      workspaceId,
      createdAt: now,
      updatedAt: now,
      ...motionTokenItemToDbFields(rest),
    };
  });

  await db.insert(motionTokens).values(tokenRows);

  return NextResponse.json({
    workspace: {
      id: workspaceId,
      name,
      kind,
      createdAt: now.toISOString(),
      role: "owner",
    },
  });
}
