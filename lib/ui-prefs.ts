import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiPrefs = {
  workspaceLabel: string;
  setWorkspaceLabel: (label: string) => void;
};

export const useUiPrefs = create<UiPrefs>()(
  persist(
    (set) => ({
      workspaceLabel: "My workspace",
      setWorkspaceLabel: (workspaceLabel) => set({ workspaceLabel }),
    }),
    { name: "tokn-ui-prefs" },
  ),
);
