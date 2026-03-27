import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getDb } from "@/db";
import { users } from "@/db/schema";

const signupSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  const db = await createSupabaseServerClient();

  const parsed = signupSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: name ? { full_name: name } : {},
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.session) {
    const email = data.user?.email;
    if (email) {
      try {
        const db = getDb();
        const now = new Date();
        const existingUsers = await db.select().from(users).where(eq(users.email, email));
        if (existingUsers.length === 0) {
          await db.insert(users).values({ email, createdAt: now });
        }
      } catch (e) {
        console.error("Postgres user upsert failed (non-blocking)", e);
      }
    }
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  }

  return NextResponse.json({ ok: true, redirectTo: "/signin?verify=1" });
}

