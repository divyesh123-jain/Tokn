export type WorkspaceKind = "individual" | "team";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  kind: WorkspaceKind;
  createdAt: string;
  role: string;
};
