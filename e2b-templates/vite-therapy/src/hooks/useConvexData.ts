import { useState, useEffect, useCallback } from "react";

// Placeholder for cross-device persistence via Convex anonymous auth.
// Falls back to localStorage until Convex client is configured.
// To enable: set VITE_CONVEX_URL env var in the sandbox.

export function useConvexData<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`convex_${key}`);
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`convex_${key}`, JSON.stringify(value));
    } catch {
      // Storage full
    }
  }, [key, value]);

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof newValue === "function"
        ? (newValue as (prev: T) => T)(prev)
        : newValue;
      return resolved;
    });
  }, []);

  return [value, updateValue];
}
