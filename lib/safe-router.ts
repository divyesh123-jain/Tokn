import { startTransition } from "react";

export function scheduleRouterAction(action: () => void) {
  if (typeof window === "undefined") return;
  setTimeout(() => {
    startTransition(action);
  }, 0);
}
