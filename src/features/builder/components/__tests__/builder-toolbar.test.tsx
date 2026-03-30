import { fireEvent,render, screen } from "@testing-library/react";
import React from "react";

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

vi.mock("@/shared/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

// ToggleGroup mock: uses React context to pass onValueChange to items
const ToggleGroupContext = React.createContext<((v: string) => void) | undefined>(undefined);
vi.mock("@/shared/components/ui/toggle-group", () => ({
  ToggleGroup: ({ children, onValueChange, value, className, ...props }: any) => (
    <ToggleGroupContext.Provider value={onValueChange}>
      <div role="radiogroup" data-value={value} className={className} {...props}>
        {children}
      </div>
    </ToggleGroupContext.Provider>
  ),
  ToggleGroupItem: ({ children, value, className, ...props }: any) => {
    const onValueChange = React.useContext(ToggleGroupContext);
    return (
      <button
        role="radio"
        data-value={value}
        className={className}
        onClick={() => onValueChange?.(value)}
        {...props}
      >
        {children}
      </button>
    );
  },
}));

const baseProps = {
  view: "preview" as const,
  onViewChange: vi.fn(),
  deviceSize: "desktop" as const,
  onDeviceSizeChange: vi.fn(),
  status: "idle" as const,
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

  it("status='generating' shows 'Building your app' indicator", () => {
    render(<BuilderToolbar {...baseProps} status="generating" />);
    expect(screen.getByText(/building your app/i)).toBeInTheDocument();
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
    // Mobile panel toggle — ToggleGroup renders items with role="radio"
    const chatRadio = screen.getByRole("radio", { name: "Chat" });
    const previewRadios = screen.getAllByRole("radio", { name: "Preview" });
    expect(chatRadio).toBeInTheDocument();
    expect(previewRadios.length).toBeGreaterThan(0);
    fireEvent.click(previewRadios[0]);
    expect(onMobilePanelChange).toHaveBeenCalledWith("preview");
  });

  it("device size buttons call onDeviceSizeChange", () => {
    const onDeviceSizeChange = vi.fn();
    render(<BuilderToolbar {...baseProps} onDeviceSizeChange={onDeviceSizeChange} />);
    const mobileBtn = screen.getByRole("radio", { name: "Mobile" });
    fireEvent.click(mobileBtn);
    expect(onDeviceSizeChange).toHaveBeenCalledWith("mobile");
  });

  it("renders a segmented control with both Preview and Source tabs on desktop", () => {
    render(<BuilderToolbar {...baseProps} hasFiles={true} />);
    const radios = screen.getAllByRole("radio");
    const radioLabels = radios.map((t) => t.textContent);
    expect(radioLabels).toContain("Preview");
    expect(radioLabels).toContain("Source");
  });

  it("calls onViewChange with 'code' when Source tab is clicked", () => {
    const onViewChange = vi.fn();
    render(<BuilderToolbar {...baseProps} hasFiles={true} onViewChange={onViewChange} />);
    const sourceRadio = screen.getAllByRole("radio").find((t) => t.textContent === "Source");
    fireEvent.click(sourceRadio!);
    expect(onViewChange).toHaveBeenCalledWith("code");
  });

  it("calls onViewChange with 'preview' when Preview tab is clicked", () => {
    const onViewChange = vi.fn();
    render(<BuilderToolbar {...baseProps} hasFiles={true} onViewChange={onViewChange} />);
    const previewRadio = screen.getAllByRole("radio").find((t) => t.textContent === "Preview");
    fireEvent.click(previewRadio!);
    expect(onViewChange).toHaveBeenCalledWith("preview");
  });

  it("does not render standalone Source button in right section", () => {
    render(<BuilderToolbar {...baseProps} hasFiles={true} />);
    const rightButtons = screen.queryAllByLabelText("View source");
    expect(rightButtons).toHaveLength(0);
  });
});
