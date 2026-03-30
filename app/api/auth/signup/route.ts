import { NextResponse } from "next/server";
import { z } from "zod";

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
    const userId = data.user?.id;
    if (email && userId) {
      try {
        const db = getDb();
        const now = new Date();
        await db
          .insert(users)
          .values({ id: userId, email, createdAt: now })
          .onConflictDoNothing({ target: users.email });
      } catch (e) {
        console.error("Postgres user upsert failed (non-blocking)", e);
      }
    }
    await db.auth.signOut();
    return NextResponse.json({ ok: true, redirectTo: "/signin?signup=1" });
  }

  return NextResponse.json({ ok: true, redirectTo: "/signin?verify=1&signup=1" });
}

