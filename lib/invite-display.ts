export function formatInviteCountdown(expiresAtIso: string, now = Date.now()) {
  const expiresAt = new Date(expiresAtIso).getTime();
  const remaining = expiresAt - now;
  if (remaining <= 0) return { label: "Expired", tone: "danger" as const };

  const hours = Math.ceil(remaining / (60 * 60 * 1000));
  if (hours <= 2) return { label: `in ${hours} hour${hours === 1 ? "" : "s"}`, tone: "danger" as const };
  if (hours <= 24) return { label: `in ${hours} hours`, tone: "warning" as const };
  return { label: `in ${hours} hours`, tone: "default" as const };
}