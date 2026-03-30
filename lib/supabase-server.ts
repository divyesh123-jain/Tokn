import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function normalizeCookiePath(pathValue: unknown): string {
  if (typeof pathValue !== "string") return "/";
  const trimmed = pathValue.trim();
  if (!trimmed || trimmed === "//") return "/";
  if (!trimmed.startsWith("/")) return "/";
  return trimmed.replace(/\/{2,}/g, "/");
}

export async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const cookieStore = await cookies();

  function safeSetCookie(
    name: string,
    value: string,
    options: {
      httpOnly?: boolean;
      sameSite?: "lax" | "strict" | "none";
      path?: string;
      maxAge?: number;
      expires?: Date;
      secure?: boolean;
    },
  ) {
    try {
      cookieStore.set(name, value, options);
    } catch {
      // In server components, Next.js does not allow mutating cookies during render.
      // Supabase may still attempt a refresh write; ignore here and allow request to proceed.
    }
  }

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
        const normalizedOptions = {
          ...options,
          path: normalizeCookiePath(options.path),
        };
        safeSetCookie(
          name,
          value,
          normalizedOptions as {
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
          path: normalizeCookiePath(options.path),
          maxAge: 0,
          expires: new Date(0),
        };
        safeSetCookie(
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

