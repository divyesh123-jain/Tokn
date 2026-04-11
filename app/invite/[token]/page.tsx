"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { workspaceApiFetchInit } from "@/lib/workspace-fetch";

type InviteResponse = {
  invite: {
    id: string;
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string;
    email: string;
    role: "editor" | "viewer";
    token: string;
    invitedBy: string;
    invitedByName: string;
    expiresAt: string;
    acceptedAt: string | null;
    declinedAt: string | null;
    cancelledAt: string | null;
    createdAt: string;
    updatedAt: string;
    status: "pending" | "expired" | "cancelled" | "declined" | "accepted";
  };
};

type AuthMeResponse = {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    emailVerified: boolean;
  } | null;
};

function roleCopy(role: "editor" | "viewer") {
  return role === "editor"
    ? ["Create and edit tokens", "Browse the token library", "Copy and download export code"]
    : ["Browse the token library", "Copy export code", "View published tokens"];
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const tokenParam = params?.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  const [loading, setLoading] = React.useState(true);
  const [invite, setInvite] = React.useState<InviteResponse["invite"] | null>(null);
  const [sessionEmail, setSessionEmail] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [accepting, setAccepting] = React.useState(false);
  const [declineOpen, setDeclineOpen] = React.useState(false);
  const [declining, setDeclining] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    if (!token) return;

    async function run() {
      const [inviteRes, authRes] = await Promise.all([
        fetch(`/api/invites/${token}`, workspaceApiFetchInit),
        fetch("/api/auth/me", workspaceApiFetchInit),
      ]);

      const inviteJson = (await inviteRes.json().catch(() => null)) as InviteResponse | { error?: string } | null;
      const authJson = (await authRes.json().catch(() => null)) as AuthMeResponse | null;

      if (cancelled) return;

      if (!inviteRes.ok || !inviteJson || !("invite" in inviteJson)) {
        toast.error((inviteJson as { error?: string } | null)?.error ?? "Could not load invite");
        setLoading(false);
        return;
      }

      setInvite(inviteJson.invite);
      setSessionEmail(authJson?.user?.email ?? null);
      setName(authJson?.user?.fullName ?? "");
      setLoading(false);

      if (inviteJson.invite.status === "accepted") {
        router.replace(`/projects/${inviteJson.invite.workspaceId}`);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, token]);

  async function submitSignup() {
    if (!invite || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email: invite.email,
          password,
          inviteToken: invite.token,
        }),
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; redirectTo?: string; error?: string } | null;
      if (!res.ok || !json?.redirectTo) {
        toast.error(json?.error ?? "Could not create your account");
        return;
      }

      window.location.assign(json.redirectTo);
    } finally {
      setSubmitting(false);
    }
  }

  async function acceptInvite() {
    if (!invite || accepting) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/invites/${invite.token}`, {
        ...workspaceApiFetchInit,
        method: "POST",
      });

      const json = (await res.json().catch(() => null)) as
        | { workspace?: { id: string }; error?: string }
        | { ok?: boolean; alreadyMember?: boolean; workspace?: { id: string } }
        | null;

      if (!res.ok || !json || !("workspace" in json) || !json.workspace) {
        toast.error((json as { error?: string } | null)?.error ?? "Could not accept invite");
        return;
      }

      toast.success(`Welcome to ${invite.workspaceName}! You joined as ${invite.role === "editor" ? "Editor" : "Viewer"}.`);
      router.replace(`/projects/${json.workspace.id}`);
    } finally {
      setAccepting(false);
    }
  }

  async function declineInvite() {
    if (!invite || declining) return;
    setDeclining(true);
    try {
      const res = await fetch(`/api/invites/${invite.token}`, {
        ...workspaceApiFetchInit,
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(json?.error ?? "Could not decline invite");
        return;
      }

      router.replace("/");
    } finally {
      setDeclining(false);
      setDeclineOpen(false);
    }
  }

  if (!token || loading || !invite) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(80,80,120,0.12),transparent_40%),linear-gradient(to_bottom,#f8fafc,white)] px-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading invite…
        </div>
      </main>
    );
  }

  if (invite.status === "expired") {
    return (
      <ErrorState
        title="This invite has expired"
        description={`The invite to ${invite.workspaceName} sent to ${invite.email} expired. Ask ${invite.invitedByName} to send you a new invite.`}
      />
    );
  }

  if (invite.status === "cancelled" || invite.status === "declined") {
    return (
      <ErrorState
        title="This invite is no longer valid"
        description={`The invite to ${invite.workspaceName} has been cancelled by the workspace owner.`}
      />
    );
  }

  if (sessionEmail && sessionEmail.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <ErrorState
        title="This invite was sent to a different email"
        description={`The invite to ${invite.workspaceName} was sent to ${invite.email}. Sign in with that account to continue.`}
      />
    );
  }

  if (!sessionEmail) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(20,20,20,0.05),transparent_33%),linear-gradient(to_bottom,#ffffff,#f8fafc)] px-6 py-10 text-foreground">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
          <div className="grid w-full gap-8 rounded-[2rem] border border-border bg-background p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:grid-cols-[1.15fr_0.85fr] md:p-10">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-[10px] font-bold uppercase tracking-tight text-primary-foreground">tk</span>
                tokn
              </Link>

              <div className="mt-8 space-y-4">
                <Badge variant="outline">Team invite</Badge>
                <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
                  {invite.invitedByName} invited you to join {invite.workspaceName} as an {invite.role === "editor" ? "Editor" : "Viewer"}.
                </h1>
                <p className="max-w-xl text-sm text-muted-foreground md:text-base">
                  Create your account to accept the invite and join the workspace in one step.
                </p>
              </div>

              <div className="mt-8 rounded-2xl border border-border bg-muted/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your access</p>
                <ul className="mt-4 space-y-2 text-sm text-foreground">
                  {roleCopy(invite.role).map((item) => (
                    <li key={item}>✓ {item}</li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">This invite expires in 48 hours.</p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-sm md:p-8">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Create your account to accept</p>
                <h2 className="text-2xl font-semibold tracking-tight">Join {invite.workspaceName}</h2>
              </div>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email address</label>
                  <Input value={invite.email} disabled className="h-11 bg-muted/40" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Full name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-11" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Create a password" className="h-11" />
                </div>

                <Button className="h-11 w-full" onClick={() => void submitSignup()} disabled={submitting || password.length < 8}>
                  {submitting ? "Creating account…" : "Create account & join workspace"}
                </Button>

                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href={`/signin?invite=${encodeURIComponent(invite.token)}`} className="font-medium text-foreground underline underline-offset-4">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(20,20,20,0.05),transparent_33%),linear-gradient(to_bottom,#ffffff,#f8fafc)] px-6 py-10 text-foreground">
      <div className="w-full max-w-2xl rounded-[2rem] border border-border bg-background p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-10">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-[10px] font-bold uppercase tracking-tight text-primary-foreground">tk</span>
            tokn
          </Link>
          <Badge variant="outline">{invite.role === "editor" ? "Editor" : "Viewer"}</Badge>
        </div>

        <div className="mt-8 space-y-4">
          <p className="text-sm font-medium text-muted-foreground">You&apos;ve been invited to join</p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{invite.workspaceName}</h1>
          <p className="text-muted-foreground">
            Invited by {invite.invitedByName}. Your access level is {invite.role === "editor" ? "Editor" : "Viewer"}.
          </p>
        </div>

        <div className="mt-8 grid gap-3 rounded-2xl border border-border bg-muted/20 p-5 text-sm md:grid-cols-2">
          <div>
            <p className="font-medium text-foreground">As a {invite.role === "editor" ? "Editor" : "Viewer"} you can:</p>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              {roleCopy(invite.role).map((item) => (
                <li key={item}>✓ {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">You cannot:</p>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              <li>✗ Invite or remove members</li>
              <li>✗ Publish versions</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button className="h-11 flex-1" onClick={() => void acceptInvite()} disabled={accepting}>
            {accepting ? "Accepting…" : "Accept and join workspace"}
          </Button>
          <Button variant="outline" className="h-11" onClick={() => setDeclineOpen(true)}>
            Decline invite
          </Button>
        </div>

        <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Decline this invite?</DialogTitle>
              <DialogDescription>
                {invite.invitedByName} will not be notified.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeclineOpen(false)}>
                Keep invite
              </Button>
              <Button variant="destructive" onClick={() => void declineInvite()} disabled={declining}>
                {declining ? "Declining…" : "Yes, decline"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(20,20,20,0.05),transparent_33%),linear-gradient(to_bottom,#ffffff,#f8fafc)] px-6 py-10 text-foreground">
      <div className="w-full max-w-xl rounded-[2rem] border border-border bg-background p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-10">
        <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-[10px] font-bold uppercase tracking-tight text-primary-foreground">tk</span>
          tokn
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground md:text-base">{description}</p>
        <div className="mt-8">
          <Button variant="default" onClick={() => window.location.assign("/")}>Go to tokn.so</Button>
        </div>
      </div>
    </main>
  );
}