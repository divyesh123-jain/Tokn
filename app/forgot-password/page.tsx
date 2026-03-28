"use client";

import Link from "next/link";

function LogoMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#534AB7] text-sm font-bold text-white">
      tk
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1a1a2e]">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center px-6 py-14">
        <div className="w-full max-w-[460px] rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex items-start justify-center">
            <LogoMark />
          </div>

          <h1 className="mt-6 text-center text-3xl font-medium leading-tight">
            Reset your password
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter your email and we&apos;ll send a reset link.
          </p>

          <form
            className="mt-7 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = "/projects";
            }}
          >
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                placeholder="name@studio.com"
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm shadow-none outline-none transition focus-visible:ring-2 focus-visible:ring-[#534AB7]/40"
                required
              />
            </div>

            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center rounded-xl bg-[#534AB7] text-sm font-semibold text-white transition hover:bg-[#4b42aa]"
            >
              Send reset link
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/signin" className="font-semibold text-[#534AB7] hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

