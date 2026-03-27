import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getDb } from "@/db";
import { users } from "@/db/schema";

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const parsed = signinSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.session) {
    return NextResponse.json({ error: "No active session" }, { status: 401 });
  }

  const userEmail = data.user?.email;
  if (userEmail) {
    try {
      const pg = getDb();
      const now = new Date();
      const existingUsers = await pg.select().from(users).where(eq(users.email, userEmail));
      if (existingUsers.length === 0) {
        await pg.insert(users).values({ email: userEmail, createdAt: now });
      }
    } catch (e) {
      console.error("Postgres user upsert failed (non-blocking)", e);
    }
  }

  return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
}

