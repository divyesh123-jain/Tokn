"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ToknSignUpMarketing } from "@/components/tokn-signup-marketing";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function onSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok: true; redirectTo: string }
        | { error: string }
        | null;

      if (!res.ok || !json || "error" in json) {
        toast.error(json && "error" in json ? json.error : "Signup failed");
        return;
      }

      router.push(json.redirectTo);
    } catch {
      toast.error("Signup failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ToknSignUpMarketing
      name={name}
      email={email}
      password={password}
      onNameChange={setName}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
    />
  );
}

