export type WorkspaceKind = "individual" | "team";

export type WorkspaceRole = "owner" | "editor" | "viewer";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  kind: WorkspaceKind;
  createdAt: string;
  role: WorkspaceRole;
};

export type WorkspaceMember = {
  id: string;
  userId: string;
  email: string;
  role: WorkspaceRole;
  createdAt: string;
};

export type WorkspaceInviteStatus = "pending" | "expired" | "cancelled" | "declined" | "accepted";

export type WorkspaceInvite = {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  invitedBy: string;
  invitedByName: string;
  expiresAt: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  status: WorkspaceInviteStatus;
};
