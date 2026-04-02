"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";

import type { useToolBuilder } from "../../hooks/use-tool-builder";
import { templateRegistry } from "../../lib/registry";
import { AIAssistPanel } from "./ai-assist-panel";
import { AppearanceControls } from "./appearance-controls";
import { ConfigEditor } from "./config-editor";
import { PreviewPanel } from "./preview-panel";
import { PublishSheet } from "./publish-sheet";

type Builder = ReturnType<typeof useToolBuilder>;

interface ToolBuilderWizardProps {
  builder: Builder;
}

export function ToolBuilderWizard({ builder }: ToolBuilderWizardProps) {
  const config = builder.config as Record<string, unknown> | null;
  const title = (config?.title as string) ?? "Untitled";

  const handleTitleChange = (newTitle: string) => {
    if (!config) return;
    builder.updateConfig({ ...config, title: newTitle });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-2 shrink-0 h-12">
        <Link
          href="/tools"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to tools"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>

        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground min-w-0"
          placeholder="Tool title"
          aria-label="Tool title"
        />

        <span className="text-xs text-muted-foreground shrink-0">
          {builder.isSaving ? "Saving…" : builder.instanceId ? "Saved" : ""}
        </span>

        <Button
          size="sm"
          onClick={builder.openPublish}
          disabled={!builder.instanceId}
          className="shrink-0"
        >
          Publish →
        </Button>
      </div>

      {/* Editor body */}
      {builder.templateType ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — 40% */}
          <div className="w-[40%] min-w-[300px] border-r border-border flex flex-col overflow-hidden">
            {/* AI Refine — always visible at top */}
            <div className="p-4 border-b border-border shrink-0">
              <AIAssistPanel
                templateType={builder.templateType}
                childProfile={{}}
                initialDescription={builder.originalDescription ?? undefined}
                onApply={(configJson) => {
                  const reg = templateRegistry[builder.templateType!];
                  if (reg) builder.updateConfig(reg.parseConfig(configJson));
                }}
              />
            </div>

            {/* Content / Appearance tabs */}
            <Tabs defaultValue="content" className="flex flex-col flex-1 overflow-hidden">
              <div className="px-4 pt-3 shrink-0">
                <TabsList className="w-full">
                  <TabsTrigger value="content" className="flex-1">
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="appearance" className="flex-1">
                    Appearance
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="content" className="flex-1 overflow-y-auto p-4 mt-0">
                <ConfigEditor
                  templateType={builder.templateType}
                  config={builder.config}
                  onChange={builder.updateConfig}
                />
              </TabsContent>

              <TabsContent value="appearance" className="overflow-y-auto p-4 mt-0">
                <AppearanceControls
                  value={builder.appearance}
                  onChange={builder.updateAppearance}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right panel — 60% */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/20 shrink-0">
              <span className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
                Preview
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              <PreviewPanel
                templateType={builder.templateType}
                config={builder.config}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Select a tool type to begin editing.</p>
        </div>
      )}

      {/* Publish sheet */}
      <PublishSheet
        open={builder.isPublishOpen}
        onClose={builder.closePublish}
        isSaving={builder.isSaving}
        publishedShareToken={builder.publishedShareToken}
        onPublish={builder.publish}
      />
    </div>
  );
}
