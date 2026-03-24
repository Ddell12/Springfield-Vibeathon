"use client";

import { useMediaQuery } from "usehooks-ts";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable";

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
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      <ResizablePanel defaultSize={40} minSize={25} maxSize={55}>
        {chatPanel}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={60}>
        {previewPanel}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
