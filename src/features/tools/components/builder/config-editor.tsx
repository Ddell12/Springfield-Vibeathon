"use client";

import { templateRegistry } from "../../lib/registry";

interface ConfigEditorProps {
  templateType: string;
  config: unknown;
  onChange: (config: unknown) => void;
}

export function ConfigEditor({ templateType, config, onChange }: ConfigEditorProps) {
  const registration = templateRegistry[templateType];
  if (!registration) {
    return <p className="p-4 text-sm text-muted-foreground">Unknown template type.</p>;
  }
  const { Editor } = registration;
  return <Editor config={config} onChange={onChange} />;
}
