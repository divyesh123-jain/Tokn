import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(
        name: string,
        value: string,
        options: { httpOnly?: boolean } & Record<string, unknown>,
      ) {
        cookieStore.set(
          name,
          value,
          options as {
            httpOnly?: boolean;
            sameSite?: "lax" | "strict" | "none";
            path?: string;
            maxAge?: number;
            expires?: Date;
            secure?: boolean;
          },
        );
      },
      remove(
        name: string,
        options: { httpOnly?: boolean } & Record<string, unknown>,
      ) {
        const normalized = {
          ...options,
          path: (options.path as string | undefined) ?? "/",
          maxAge: 0,
          expires: new Date(0),
        };
        cookieStore.set(
          name,
          "",
          normalized as {
            httpOnly?: boolean;
            sameSite?: "lax" | "strict" | "none";
            path?: string;
            maxAge?: number;
            expires?: Date;
            secure?: boolean;
          },
        );
      },
    },
  });
}

