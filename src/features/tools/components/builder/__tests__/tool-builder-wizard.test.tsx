import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../hooks/use-ai-config-assist", () => ({
  useAIConfigAssist: () => ({ status: "idle", error: null, generate: vi.fn() }),
}));
vi.mock("../../lib/ai/generation-profile", () => ({
  DEFAULT_GENERATION_PROFILE: {},
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("../preview-panel", () => ({
  PreviewPanel: () => <div data-testid="preview-panel" />,
}));
vi.mock("../config-editor", () => ({
  ConfigEditor: () => <div data-testid="config-editor" />,
}));
vi.mock("../appearance-controls", () => ({
  AppearanceControls: () => <div data-testid="appearance-controls" />,
}));
vi.mock("../publish-sheet", () => ({
  PublishSheet: () => <div data-testid="publish-sheet" />,
}));
vi.mock("../goal-tags-editor", () => ({
  GoalTagsEditor: () => <div data-testid="goal-tags-editor" />,
}));
vi.mock("./template-picker", () => ({
  TemplatePicker: () => <div data-testid="template-picker" />,
}));

import type { useToolBuilder } from "../../hooks/use-tool-builder";
import { ToolBuilderWizard } from "../tool-builder-wizard";

type Builder = ReturnType<typeof useToolBuilder>;

function makeBuilder(overrides: Partial<Builder> = {}): Builder {
  return {
    step: 3 as never,
    patientId: null,
    templateType: "token_board",
    config: { title: "Test Board", tokenCount: 5, rewardLabel: "iPad", tokenShape: "star", tokenColor: "#FBBF24", highContrast: false },
    instanceId: "inst-1" as never,
    publishedShareToken: null,
    isSaving: false,
    originalDescription: null,
    isPublishOpen: false,
    appearance: { themePreset: "calm", accentColor: "#00595c" },
    selectPatient: vi.fn(),
    selectTemplate: vi.fn(),
    openPublish: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    closePublish: vi.fn(),
    updateConfig: vi.fn(),
    updateAppearance: vi.fn(),
    saveAndAdvance: vi.fn(),
    publish: vi.fn().mockResolvedValue(null),
    unpublish: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Builder;
}

describe("ToolBuilderWizard (editor)", () => {
  it("renders inline title from config", () => {
    render(<ToolBuilderWizard builder={makeBuilder()} />);
    const input = screen.getByDisplayValue("Test Board");
    expect(input).toBeInTheDocument();
  });

  it("shows Publish button", () => {
    render(<ToolBuilderWizard builder={makeBuilder()} />);
    expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument();
  });

  it("shows Content and Appearance tabs", () => {
    render(<ToolBuilderWizard builder={makeBuilder()} />);
    expect(screen.getByRole("tab", { name: /content/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /appearance/i })).toBeInTheDocument();
  });

  it("shows empty state when no template selected", () => {
    render(<ToolBuilderWizard builder={makeBuilder({ templateType: null })} />);
    expect(screen.getByText(/select a tool type/i)).toBeInTheDocument();
  });

  it("Publish button is disabled when no instanceId", () => {
    render(<ToolBuilderWizard builder={makeBuilder({ instanceId: null })} />);
    expect(screen.getByRole("button", { name: /publish/i })).toBeDisabled();
  });
});
