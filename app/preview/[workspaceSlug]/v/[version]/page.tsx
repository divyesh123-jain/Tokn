import { notFound } from "next/navigation";

import { PublicPreviewView } from "@/components/preview/public-preview-view";
import { getPublicPreviewPayload } from "@/lib/public-preview";

export default async function PublicPreviewVersionPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; version: string }>;
}) {
  const { workspaceSlug, version } = await params;
  const payload = await getPublicPreviewPayload({ workspaceSlug, version });

  if (!payload) {
    notFound();
  }

  return (
    <PublicPreviewView
      workspaceName={payload.workspaceName}
      version={payload.version}
      publishedAtIso={payload.publishedAtIso}
      workspaceSlug={payload.workspaceSlug}
      tokens={payload.tokens}
      pinned
      isLiveDraft={payload.isLiveDraft}
    />
  );
}
