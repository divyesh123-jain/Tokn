import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { users, workspaces, workspaceInvites, workspaceMembers } from "@/db/schema";
import { getSupabaseEmailDeliveryStatus, sendEmailViaSupabaseSmtp } from "@/lib/email";
import type {
  InviteEmailDeliveryStatus,
  WorkspaceInviteStatus,
  WorkspaceRole,
} from "@/lib/workspace-types";

export const INVITE_TTL_MS = 48 * 60 * 60 * 1000;

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createInviteToken() {
  return crypto.randomUUID();
}

export function getInviteEmailDeliveryStatus(): InviteEmailDeliveryStatus {
  return getSupabaseEmailDeliveryStatus();
}

export function getInviteStatus(invite: {
  expiresAt: Date;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  cancelledAt: Date | null;
}): WorkspaceInviteStatus {
  if (invite.acceptedAt) return "accepted";
  if (invite.cancelledAt) return "cancelled";
  if (invite.declinedAt) return "declined";
  if (invite.expiresAt.getTime() < Date.now()) return "expired";
  return "pending";
}

export async function getInviteDetailsByToken(token: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: workspaceInvites.id,
      workspaceId: workspaceInvites.workspaceId,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      token: workspaceInvites.token,
      invitedBy: workspaceInvites.invitedBy,
      invitedByEmail: users.email,
      expiresAt: workspaceInvites.expiresAt,
      acceptedAt: workspaceInvites.acceptedAt,
      declinedAt: workspaceInvites.declinedAt,
      cancelledAt: workspaceInvites.cancelledAt,
      createdAt: workspaceInvites.createdAt,
      updatedAt: workspaceInvites.updatedAt,
    })
    .from(workspaceInvites)
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvites.workspaceId))
    .innerJoin(users, eq(users.id, workspaceInvites.invitedBy))
    .where(eq(workspaceInvites.token, token))
    .limit(1);

  const invite = rows[0];
  if (!invite) return null;

  const status = getInviteStatus(invite);
  return {
    id: invite.id,
    workspaceId: invite.workspaceId,
    workspaceName: invite.workspaceName,
    workspaceSlug: invite.workspaceSlug,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    invitedBy: invite.invitedBy,
    invitedByName: invite.invitedByEmail,
    status,
    expiresAt: invite.expiresAt.toISOString(),
    acceptedAt: invite.acceptedAt ? invite.acceptedAt.toISOString() : null,
    declinedAt: invite.declinedAt ? invite.declinedAt.toISOString() : null,
    cancelledAt: invite.cancelledAt ? invite.cancelledAt.toISOString() : null,
    createdAt: invite.createdAt.toISOString(),
    updatedAt: invite.updatedAt.toISOString(),
  };
}

export async function getWorkspaceInviteByEmail(workspaceId: string, email: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: workspaceInvites.id,
      token: workspaceInvites.token,
      expiresAt: workspaceInvites.expiresAt,
      acceptedAt: workspaceInvites.acceptedAt,
      declinedAt: workspaceInvites.declinedAt,
      cancelledAt: workspaceInvites.cancelledAt,
    })
    .from(workspaceInvites)
    .where(
      and(
        eq(workspaceInvites.workspaceId, workspaceId),
        eq(workspaceInvites.email, normalizeInviteEmail(email)),
        isNull(workspaceInvites.acceptedAt),
        isNull(workspaceInvites.cancelledAt),
        isNull(workspaceInvites.declinedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function hasWorkspaceMember(workspaceId: string, userId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function sendInviteEmail(args: {
  to: string;
  inviterName: string;
  workspaceName: string;
  role: WorkspaceRole;
  inviteUrl: string;
  expiresAt: Date;
}) {
  type EmailDeliveryResult =
    | { ok: true; provider: "supabase" | "none"; skipped?: boolean }
    | { ok: false; provider: "supabase"; error: string; status?: number };

  const roleLabel = args.role === "editor" ? "Editor" : "Viewer";
  const subject = `${args.inviterName} invited you to ${args.workspaceName} workspace on Tokn`;
  const expiresInHours = Math.round((args.expiresAt.getTime() - Date.now()) / (60 * 60 * 1000));

  try {
    const result = await sendEmailViaSupabaseSmtp({
      to: args.to,
      subject,
      html: `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; line-height: 1.5; color: #111827;">
          <p>Hi,</p>
          <p><strong>${escapeHtml(args.inviterName)}</strong> invited you to join the <strong>${escapeHtml(args.workspaceName)}</strong> workspace on Tokn as an <strong>${roleLabel}</strong>.</p>
          <p><a href="${escapeHtml(args.inviteUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#111827;color:#fff;text-decoration:none;font-weight:600;">Accept invite</a></p>
          <p style="color:#6b7280;font-size:14px;">This invite expires in ${expiresInHours} hours.</p>
          <p style="color:#6b7280;font-size:14px;">If you did not expect this invite, you can safely ignore it.</p>
        </div>
      `,
      text: [
        `Hi,`,
        `${args.inviterName} invited you to join the ${args.workspaceName} workspace on Tokn as an ${roleLabel}.`,
        `Accept invite: ${args.inviteUrl}`,
        `This invite expires in ${expiresInHours} hours.`,
      ].join("\n\n"),
    });

    return result;
  } catch (error) {
    const e = error as { code?: string; cause?: { code?: string } };
    const code = e?.code ?? e?.cause?.code;
    return {
      ok: false,
      provider: "supabase",
      error: code
        ? `Email delivery failed (${code}). Check Supabase SMTP settings.`
        : "Email delivery failed. Check Supabase SMTP settings.",
      status: 503,
    } satisfies EmailDeliveryResult;
  }
}

export async function sendWorkspaceJoinEmail(args: {
  to: string;
  workspaceName: string;
  memberName: string;
  role: WorkspaceRole;
}) {
  try {
    return await sendEmailViaSupabaseSmtp({
      to: args.to,
      subject: `${args.memberName} joined ${args.workspaceName} workspace on Tokn`,
      text: `${args.memberName} just joined ${args.workspaceName} workspace on Tokn as ${args.role}.`,
    });
  } catch {
    return { ok: false as const };
  }
}

export async function acceptWorkspaceInviteByToken(args: {
  token: string;
  userId: string;
  userEmail: string;
}) {
  const db = getDb();
  const rows = await db
    .select({
      id: workspaceInvites.id,
      workspaceId: workspaceInvites.workspaceId,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      expiresAt: workspaceInvites.expiresAt,
      acceptedAt: workspaceInvites.acceptedAt,
      declinedAt: workspaceInvites.declinedAt,
      cancelledAt: workspaceInvites.cancelledAt,
    })
    .from(workspaceInvites)
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvites.workspaceId))
    .where(eq(workspaceInvites.token, args.token))
    .limit(1);

  const invite = rows[0];
  if (!invite) {
    return { ok: false as const, status: 404, error: "Invite not found" };
  }

  const status = getInviteStatus(invite);
  if (status === "expired") {
    return { ok: false as const, status: 410, error: "This invite has expired" };
  }
  if (status === "cancelled" || status === "declined") {
    return { ok: false as const, status: 410, error: "This invite is no longer valid" };
  }
  if (normalizeInviteEmail(invite.email) !== normalizeInviteEmail(args.userEmail)) {
    return {
      ok: false as const,
      status: 403,
      error: `This invite was sent to ${invite.email}`,
    };
  }

  const existingMember = await db
    .select({ id: workspaceMembers.id, role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, invite.workspaceId), eq(workspaceMembers.userId, args.userId)))
    .limit(1);

  const now = new Date();
  if (existingMember.length > 0) {
    await db
      .update(workspaceInvites)
      .set({ acceptedAt: now, declinedAt: null, cancelledAt: null, updatedAt: now })
      .where(eq(workspaceInvites.id, invite.id));

    return {
      ok: true as const,
      alreadyMember: true as const,
      workspace: {
        id: invite.workspaceId,
        name: invite.workspaceName,
        slug: invite.workspaceSlug,
        role: existingMember[0].role,
      },
      invite: {
        id: invite.id,
        role: invite.role,
        email: invite.email,
      },
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(workspaceMembers)
      .values({
        workspaceId: invite.workspaceId,
        userId: args.userId,
        role: invite.role,
        createdAt: now,
      })
      .onConflictDoNothing({ target: [workspaceMembers.workspaceId, workspaceMembers.userId] });

    await tx
      .update(workspaceInvites)
      .set({ acceptedAt: now, declinedAt: null, cancelledAt: null, updatedAt: now })
      .where(eq(workspaceInvites.id, invite.id));
  });

  return {
    ok: true as const,
    workspace: {
      id: invite.workspaceId,
      name: invite.workspaceName,
      slug: invite.workspaceSlug,
      role: invite.role,
    },
    invite: {
      id: invite.id,
      role: invite.role,
      email: invite.email,
    },
  };
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}