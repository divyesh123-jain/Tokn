import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { motionTokens, users, workspaceMembers, workspaces } from "@/db/schema";
import { initialMotionTokens } from "@/lib/motif";
import { motionTokenItemToDbFields, motionTokenDbRowToItem } from "@/lib/token-db";

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
  ownerEmail: z.string().email(),
  workspaceName: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const db = getDb();
  const parsed = createWorkspaceSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { ownerEmail, workspaceName } = parsed.data;
  const now = new Date();

  const existingUsers = await db.select().from(users).where(eq(users.email, ownerEmail));
  let userId: string;
  if (existingUsers.length === 0) {
    const insertedUsers = await db.insert(users).values({ email: ownerEmail, createdAt: now }).returning();
    userId = insertedUsers[0].id;
  } else {
    userId = existingUsers[0].id;
  }

  const insertedWorkspaces = await db
    .insert(workspaces)
    .values({ name: workspaceName, createdAt: now })
    .returning();

  const workspaceId = insertedWorkspaces[0].id;

  await db.insert(workspaceMembers).values({
    workspaceId,
    userId,
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

  const tokenListRows = await db
    .select()
    .from(motionTokens)
    .where(eq(motionTokens.workspaceId, workspaceId));

  const tokens = tokenListRows.map((r) =>
    motionTokenDbRowToItem(r as unknown as { workspaceId: string; id: string } & typeof r),
  );

  return NextResponse.json({ workspaceId, userId, tokens });
}

