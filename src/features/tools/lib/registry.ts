import type { ComponentType } from "react";

import { AACBoardEditor } from "./templates/aac-board/editor";
import { AACBoardRuntime } from "./templates/aac-board/runtime";
import { AACBoardConfigSchema, type AACBoardConfig } from "./templates/aac-board/schema";

export interface RuntimeProps<TConfig = unknown> {
  config: TConfig;
  shareToken: string;
  onEvent: (type: string, payloadJson?: string) => void;
}

export interface EditorProps<TConfig = unknown> {
  config: TConfig;
  onChange: (config: TConfig) => void;
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  intendedFor: string;
  estimatedSetupMinutes: number;
}

export interface TemplateRegistration {
  meta: TemplateMeta;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Editor: ComponentType<EditorProps<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Runtime: ComponentType<RuntimeProps<any>>;
  defaultConfig: unknown;
  parseConfig: (json: string) => unknown;
}

const DEFAULT_AAC_CONFIG: AACBoardConfig = {
  title: "New Communication Board",
  gridCols: 3,
  gridRows: 2,
  buttons: [
    { id: "1", label: "Yes", speakText: "Yes" },
    { id: "2", label: "No", speakText: "No" },
    { id: "3", label: "Help", speakText: "I need help" },
    { id: "4", label: "More", speakText: "More please" },
    { id: "5", label: "Done", speakText: "I am done" },
    { id: "6", label: "Break", speakText: "I need a break" },
  ],
  showTextLabels: true,
  autoSpeak: true,
  voice: "child-friendly",
  highContrast: false,
};

export const templateRegistry: Record<string, TemplateRegistration> = {
  aac_board: {
    meta: {
      id: "aac_board",
      name: "AAC Communication Board",
      description: "Tappable picture-and-word buttons that speak aloud when pressed.",
      intendedFor: "Children using AAC or building functional communication",
      estimatedSetupMinutes: 5,
    },
    Editor: AACBoardEditor,
    Runtime: AACBoardRuntime,
    defaultConfig: DEFAULT_AAC_CONFIG,
    parseConfig: (json: string) => AACBoardConfigSchema.parse(JSON.parse(json)),
  },
};
