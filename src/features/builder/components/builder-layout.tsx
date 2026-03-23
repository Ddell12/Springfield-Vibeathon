"use client";

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/shared/components/ui/resizable";
import { useMediaQuery } from "usehooks-ts";

export function BuilderLayout({
  chatPanel,
  previewPanel,
}: {
  chatPanel: React.ReactNode;
  previewPanel: React.ReactNode;
}) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {chatPanel}
        {previewPanel}
      </div>
    );
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-[calc(100vh-64px)]">
      <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
        {chatPanel}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={65}>
        {previewPanel}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
