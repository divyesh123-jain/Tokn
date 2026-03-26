import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const flow = url.searchParams.get("flow") ?? "google";

  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.set("auth-demo", flow, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

