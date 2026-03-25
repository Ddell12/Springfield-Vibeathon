// Mock for react-resizable-panels — renders simple divs with correct data attributes
// Needed because the real library uses ResizeObserver which isn't available in jsdom
import React from "react";

export type GroupProps = React.HTMLAttributes<HTMLDivElement> & {
  direction?: "horizontal" | "vertical";
  children?: React.ReactNode;
};

export type PanelProps = React.HTMLAttributes<HTMLDivElement> & {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  children?: React.ReactNode;
};

export type SeparatorProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
};

export function Group({ children, className, ...props }: GroupProps) {
  return (
    <div data-panel-group="" className={className} {...props}>
      {children}
    </div>
  );
}

export function Panel({ children, className, defaultSize: _defaultSize, minSize: _minSize, maxSize: _maxSize, ...props }: PanelProps) {
  return (
    <div data-panel="" className={className} style={{ flex: 1 }} {...props}>
      {children}
    </div>
  );
}

export function Separator({ children, className, ...props }: SeparatorProps) {
  return (
    <div data-panel-resize-handle-id="" className={className} {...props}>
      {children}
    </div>
  );
}
