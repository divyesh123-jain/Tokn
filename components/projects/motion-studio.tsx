"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { PreviewPanel } from "./motion-studio/preview-panel";
import { PropertiesPanel } from "./motion-studio/properties-panel";
import { SectionPanel } from "./motion-studio/section-panel";
import { TokenListPanel } from "./motion-studio/token-list-panel";

import type { StudioSection } from "./motion-studio/shared";

export function MotionStudio({
  embedded,
  workspaceName,
}: {
  embedded?: boolean;
  workspaceName?: string;
} = {}) {
  const [activeSection, setActiveSection] = useState<StudioSection>("library");
  const [additiveMotion, setAdditiveMotion] = useState(true);
  const [relativeUnits, setRelativeUnits] = useState(false);

  return (
    <div
      className={cn(
        "h-full min-h-0 overflow-hidden bg-background text-foreground",
        !embedded && "min-h-screen",
      )}
    >
      <div className="flex h-full min-h-0 min-w-290">
        <TokenListPanel
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          workspaceName={workspaceName}
        />
        <div className="min-w-0 flex-1">
          <div className="flex h-full min-h-0">
            {activeSection === "physics-lab" ? (
              <>
                <PreviewPanel
                  additiveMotion={additiveMotion}
                  relativeUnits={relativeUnits}
                />
                <PropertiesPanel
                  additiveMotion={additiveMotion}
                  setAdditiveMotion={setAdditiveMotion}
                  relativeUnits={relativeUnits}
                  setRelativeUnits={setRelativeUnits}
                />
              </>
            ) : (
              <SectionPanel section={activeSection} onSectionChange={setActiveSection} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
