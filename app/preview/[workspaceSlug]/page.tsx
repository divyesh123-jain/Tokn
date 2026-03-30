import { notFound } from "next/navigation";

import { PublicPreviewView } from "@/components/preview/public-preview-view";
import { getPublicPreviewPayload } from "@/lib/public-preview";

export default async function PublicPreviewPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const payload = await getPublicPreviewPayload({ workspaceSlug });

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
      pinned={false}
      isLiveDraft={payload.isLiveDraft}
    />
  );
}
