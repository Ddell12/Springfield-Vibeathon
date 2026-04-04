"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/shared/components/ui/dialog";
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
import { GoalTagsEditor } from "./goal-tags-editor";
import { PreviewPanel } from "./preview-panel";
import { PublishSheet } from "./publish-sheet";
import { TemplatePicker } from "./template-picker";

type Builder = ReturnType<typeof useToolBuilder>;

interface ToolBuilderWizardProps {
  builder: Builder;
}

export function ToolBuilderWizard({ builder }: ToolBuilderWizardProps) {
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const config = builder.config as Record<string, unknown> | null;
  const title = (config?.title as string) ?? "Untitled";

  const handleTitleChange = (newTitle: string) => {
    if (!builder.config) return;
    builder.updateConfig({ ...(builder.config as Record<string, unknown>), title: newTitle });
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
          {/* Left panel — full on mobile, 40% on tablet+ */}
          <div className="w-full md:w-[40%] md:min-w-[300px] border-r border-border flex flex-col overflow-hidden">
            {/* AI Refine — always visible at top */}
            <div className="p-4 border-b border-border shrink-0">
              <AIAssistPanel
                templateType={builder.templateType}
                childProfile={{}}
                initialDescription={builder.originalDescription ?? undefined}
                onApply={(configJson) => {
                  const type = builder.templateType;
                  if (!type) return;
                  const reg = templateRegistry[type];
                  if (!reg) return;
                  try {
                    builder.updateConfig(reg.parseConfig(configJson));
                  } catch (err) {
                    console.error("[ToolBuilderWizard] parseConfig failed:", err);
                  }
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
                {builder.instanceId && (
                  <div className="mt-6 pt-4 border-t border-border px-4 pb-4">
                    <GoalTagsEditor
                      instanceId={builder.instanceId}
                      initialTags={(builder.config as { goalTags?: string[] })?.goalTags ?? []}
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="appearance" className="flex-1 overflow-y-auto p-4 mt-0">
                <AppearanceControls
                  value={builder.appearance}
                  onChange={builder.updateAppearance}
                />
              </TabsContent>
            </Tabs>

            {/* Mobile preview button */}
            <div className="md:hidden p-4 border-t border-border shrink-0">
              <Button variant="outline" className="w-full" onClick={() => setShowMobilePreview(true)}>
                Preview
              </Button>
            </div>
          </div>

          {/* Right panel — hidden on mobile, 60% on tablet+ */}
          <div className="hidden md:flex flex-1 flex-col overflow-hidden">
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

      {/* Mobile preview dialog */}
      {builder.templateType && (
        <Dialog open={showMobilePreview} onOpenChange={setShowMobilePreview}>
          <DialogContent className="max-w-full w-full h-[90vh] p-0 md:hidden">
            <div className="h-full overflow-auto">
              <PreviewPanel
                templateType={builder.templateType}
                config={builder.config}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Publish sheet */}
      <PublishSheet
        open={builder.isPublishOpen}
        onClose={builder.closePublish}
        isSaving={builder.isSaving}
        publishedShareToken={builder.publishedShareToken}
        instanceId={builder.instanceId}
        patientId={builder.patientId}
        onSelectPatient={builder.selectPatient}
        onPublish={builder.publish}
        onUnpublish={builder.unpublish}
      />
    </div>
  );
}
