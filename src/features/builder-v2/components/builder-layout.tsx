"use client";

import { useMediaQuery } from "usehooks-ts";

type BuilderV2LayoutProps = {
  chatPanel: React.ReactNode;
  previewPanel: React.ReactNode;
};

export function BuilderV2Layout({ chatPanel, previewPanel }: BuilderV2LayoutProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {chatPanel}
        {previewPanel}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-[400px] shrink-0 overflow-hidden">
        {chatPanel}
      </div>
      <div className="flex-1 overflow-hidden">
        {previewPanel}
      </div>
    </div>
  );
}
