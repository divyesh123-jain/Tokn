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
