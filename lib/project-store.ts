import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProjectKind = "individual" | "team";

export type ToknProject = {
  id: string;
  name: string;
  kind: ProjectKind;
  createdAt: number;
};

type ProjectState = {
  projects: ToknProject[];
  workspaceLabel: string;
  setWorkspaceLabel: (label: string) => void;
  addProject: (input: { name: string; kind: ProjectKind }) => ToknProject;
  removeProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      workspaceLabel: "My workspace",

      setWorkspaceLabel: (workspaceLabel) => set({ workspaceLabel }),

      addProject: ({ name, kind }) => {
        const project: ToknProject = {
          id: crypto.randomUUID(),
          name: name.trim() || "Untitled",
          kind,
          createdAt: Date.now(),
        };
        set((s) => ({ projects: [...s.projects, project] }));
        return project;
      },

      removeProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      renameProject: (id, name) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, name: name.trim() || p.name } : p,
          ),
        })),
    }),
    { name: "tokn-projects" },
  ),
);
