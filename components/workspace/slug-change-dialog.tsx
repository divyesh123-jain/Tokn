"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SlugChangeImpact } from "@/lib/workspace-identity";

type SlugChangeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  impact: SlugChangeImpact | null;
  saving: boolean;
  onConfirm: () => void;
};

export function SlugChangeDialog({
  open,
  onOpenChange,
  impact,
  saving,
  onConfirm,
}: SlugChangeDialogProps) {
  if (!impact) return null;

  const legacyStillWorks =
    impact.legacyPreviewUrl !== impact.previousPreviewUrl &&
    impact.legacyPreviewUrl !== impact.nextPreviewUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change preview URL slug?</DialogTitle>
          <DialogDescription>
            Public preview links use your slug. Bookmarked and shared URLs may stop working.
          </DialogDescription>
        </DialogHeader>

        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Stops working:</span>{" "}
            <span className="break-all font-mono text-xs">{impact.previousPreviewUrl}</span>
          </li>
          <li>
            <span className="font-medium text-foreground">New canonical URL:</span>{" "}
            <span className="break-all font-mono text-xs">{impact.nextPreviewUrl}</span>
          </li>
          {legacyStillWorks ? (
            <li>
              <span className="font-medium text-foreground">May still work:</span> legacy{" "}
              <span className="font-mono text-xs">name-id</span> links such as{" "}
              <span className="break-all font-mono text-xs">{impact.legacyPreviewUrl}</span> until you
              rename the workspace.
            </li>
          ) : null}
          <li>Pinned version URLs (<span className="font-mono text-xs">/v/…</span>) follow the same slug rules.</li>
          <li>We do not redirect old custom slugs automatically.</li>
        </ul>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={saving}>
            {saving ? "Saving..." : "Update slug"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
