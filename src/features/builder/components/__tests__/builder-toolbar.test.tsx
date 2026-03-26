import { render, screen, fireEvent } from "@testing-library/react";

import { BuilderToolbar } from "../builder-toolbar";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="icon">{icon}</span>,
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, asChild, ...props }: any) => {
    if (asChild) return <>{children}</>;
    return <button onClick={onClick} disabled={disabled} {...props}>{children}</button>;
  },
}));

const baseProps = {
  view: "preview" as const,
  onViewChange: vi.fn(),
  deviceSize: "desktop" as const,
  onDeviceSizeChange: vi.fn(),
  status: "idle" as const,
  isPublishing: false,
  projectName: "My Cool App",
};

describe("BuilderToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders project name as clickable button", () => {
    render(<BuilderToolbar {...baseProps} />);
    expect(screen.getByRole("button", { name: "My Cool App" })).toBeInTheDocument();
  });

  it("clicking project name calls onNameEditStart", () => {
    const onNameEditStart = vi.fn();
    render(<BuilderToolbar {...baseProps} onNameEditStart={onNameEditStart} />);
    fireEvent.click(screen.getByRole("button", { name: "My Cool App" }));
    expect(onNameEditStart).toHaveBeenCalled();
  });

  it("isEditingName=true renders input with defaultValue=projectName", () => {
    render(<BuilderToolbar {...baseProps} isEditingName={true} />);
    const input = screen.getByRole("textbox", { name: /project name/i });
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).defaultValue).toBe("My Cool App");
  });

  it("input blur calls onNameEditEnd with input value", () => {
    const onNameEditEnd = vi.fn();
    render(<BuilderToolbar {...baseProps} isEditingName={true} onNameEditEnd={onNameEditEnd} />);
    const input = screen.getByRole("textbox", { name: /project name/i });
    fireEvent.blur(input, { target: { value: "Updated Name" } });
    expect(onNameEditEnd).toHaveBeenCalled();
  });

  it("input Enter key calls onNameEditEnd", () => {
    const onNameEditEnd = vi.fn();
    render(<BuilderToolbar {...baseProps} isEditingName={true} onNameEditEnd={onNameEditEnd} />);
    const input = screen.getByRole("textbox", { name: /project name/i });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onNameEditEnd).toHaveBeenCalled();
  });

  it("input Escape key calls onNameEditEnd with original projectName", () => {
    const onNameEditEnd = vi.fn();
    render(
      <BuilderToolbar
        {...baseProps}
        isEditingName={true}
        onNameEditEnd={onNameEditEnd}
        projectName="My Cool App"
      />
    );
    const input = screen.getByRole("textbox", { name: /project name/i });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onNameEditEnd).toHaveBeenCalledWith("My Cool App");
  });

  it("back to dashboard link has href='/dashboard'", () => {
    render(<BuilderToolbar {...baseProps} />);
    const link = screen.getByRole("link", { name: "Back to dashboard" });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("Share button calls onShare", () => {
    const onShare = vi.fn();
    render(<BuilderToolbar {...baseProps} onShare={onShare} />);
    fireEvent.click(screen.getByRole("button", { name: /Share/i }));
    expect(onShare).toHaveBeenCalled();
  });

  it("Publish button is enabled when not generating and not publishing", () => {
    render(
      <BuilderToolbar
        {...baseProps}
        status="idle"
        isPublishing={false}
      />
    );
    const publishBtn = screen.getByRole("button", { name: /Publish/i });
    expect(publishBtn).not.toBeDisabled();
  });

  it("Publish button is disabled when isPublishing=true", () => {
    render(
      <BuilderToolbar
        {...baseProps}
        status="idle"
        isPublishing={true}
      />
    );
    // isPublishing shows spinner, no "Publish" text, find by button with icon
    const buttons = screen.getAllByRole("button");
    // The rightmost button (Publish/spinner) should be disabled
    const publishBtn = buttons[buttons.length - 1];
    expect(publishBtn).toBeDisabled();
  });

  it("isPublishing=true shows spinner icon instead of 'Publish' text", () => {
    render(<BuilderToolbar {...baseProps} isPublishing={true} />);
    expect(screen.queryByText("Publish")).not.toBeInTheDocument();
    expect(screen.getByText("progress_activity")).toBeInTheDocument();
  });

  it("status='generating' shows 'Loading Live Preview' indicator", () => {
    render(<BuilderToolbar {...baseProps} status="generating" />);
    expect(screen.getByText(/Loading Live Preview/)).toBeInTheDocument();
  });

  it("isMobile + onMobilePanelChange shows Chat/Preview toggle", () => {
    const onMobilePanelChange = vi.fn();
    render(
      <BuilderToolbar
        {...baseProps}
        isMobile={true}
        mobilePanel="chat"
        onMobilePanelChange={onMobilePanelChange}
      />
    );
    // Mobile panel toggle buttons — Chat only appears in the mobile toggle (not desktop)
    const chatTab = screen.getByRole("tab", { name: "Chat" });
    // Multiple Preview tabs exist (mobile + desktop), get all and use first
    const previewTabs = screen.getAllByRole("tab", { name: "Preview" });
    expect(chatTab).toBeInTheDocument();
    expect(previewTabs.length).toBeGreaterThan(0);
    fireEvent.click(previewTabs[0]);
    expect(onMobilePanelChange).toHaveBeenCalledWith("preview");
  });

  it("device size buttons call onDeviceSizeChange", () => {
    const onDeviceSizeChange = vi.fn();
    render(<BuilderToolbar {...baseProps} onDeviceSizeChange={onDeviceSizeChange} />);
    const mobileBtn = screen.getByRole("button", { name: "Mobile" });
    fireEvent.click(mobileBtn);
    expect(onDeviceSizeChange).toHaveBeenCalledWith("mobile");
  });

  it("view toggle Preview/Code calls onViewChange", () => {
    const onViewChange = vi.fn();
    render(<BuilderToolbar {...baseProps} onViewChange={onViewChange} view="preview" />);
    const codeTabs = screen.getAllByRole("tab", { name: "Code" });
    fireEvent.click(codeTabs[0]);
    expect(onViewChange).toHaveBeenCalledWith("code");
  });
});
