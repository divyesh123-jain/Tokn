import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db";
import { productEvents } from "@/db/schema";
import { getSessionUserState } from "@/lib/auth-helpers";

const eventSchema = z.object({
  eventName: z.string().trim().min(1).max(120),
  workspaceId: z.string().uuid().nullable().optional(),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

function isMissingProductEventsTableError(error: unknown) {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "42P01" || e?.cause?.code === "42P01";
}

export async function POST(req: Request) {
  const parsed = eventSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid analytics event" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date();
  let userId: string | null = null;
  try {
    const session = await getSessionUserState();
    userId = session.user?.userId ?? null;
  } catch {
    userId = null;
  }

  try {
    await db.insert(productEvents).values({
      workspaceId: parsed.data.workspaceId ?? null,
      userId,
      eventName: parsed.data.eventName,
      payload: parsed.data.payload ? JSON.stringify(parsed.data.payload) : null,
      createdAt: now,
    });
  } catch (error) {
    if (!isMissingProductEventsTableError(error)) {
      throw error;
    }
    return NextResponse.json({ ok: true, persisted: false });
  }

  return NextResponse.json({ ok: true, persisted: true });
}
