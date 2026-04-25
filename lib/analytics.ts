export type ProductEventPayload = Record<string, string | number | boolean | null | undefined>;

export async function trackProductEvent(args: {
  eventName: string;
  workspaceId?: string | null;
  payload?: ProductEventPayload;
}) {
  try {
    await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventName: args.eventName,
        workspaceId: args.workspaceId ?? null,
        payload: args.payload ?? {},
      }),
      keepalive: true,
    });
  } catch {
    // Analytics should never block product flows.
  }
}
