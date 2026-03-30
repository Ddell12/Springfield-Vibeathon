/**
 * Vitest mock for next/dynamic.
 *
 * Uses useEffect + useState so the component resolves inside React Testing
 * Library's act() boundary: the effect fires, the factory Promise resolves
 * (Vitest already has all mocked modules loaded), setState schedules a
 * re-render, and act() flushes everything in one shot.
 */
import React from "react";

type DynamicOptions = {
  ssr?: boolean;
  loading?: React.ComponentType;
};

export default function dynamic<P extends object>(
  factory: () => Promise<{ default: React.ComponentType<P> }>,
  options?: DynamicOptions,
): React.ComponentType<P> {
  function DynamicWrapper(props: P) {
    const [Component, setComponent] = React.useState<React.ComponentType<P> | null>(null);

    React.useEffect(() => {
      factory().then((mod) => setComponent(() => mod.default));
    }, []);

    if (!Component) {
      return options?.loading ? React.createElement(options.loading) : null;
    }
    return React.createElement(Component, props);
  }

  return DynamicWrapper as React.ComponentType<P>;
}
