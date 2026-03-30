"use client";

import { useCallback, useState } from "react";
import { cn } from "@/core/utils";

interface KidModeExitProps {
  onVerify: (pin: string) => Promise<boolean>;
  onExit: () => void;
}

export function KidModeExit({ onVerify, onExit }: KidModeExitProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);

  const handleDigit = useCallback((digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);

    if (next.length === 4) {
      onVerify(next).then((valid) => {
        if (valid) {
          onExit();
        } else {
          setShake(true);
          setTimeout(() => {
            setShake(false);
            setPin("");
          }, 500);
        }
      });
    }
  }, [pin, onVerify, onExit]);

  const handleBackspace = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

  const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <>
      {/* Hidden trigger strip at top of screen */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-0 left-0 right-0 z-[70] h-2 cursor-default"
        aria-label="Exit kid mode"
      />

      {/* Slide-down panel */}
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-[80] transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isOpen ? "translate-y-0" : "-translate-y-full"
        )}
      >
        <div className="mx-auto max-w-sm rounded-b-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
          <p className="mb-4 text-center text-sm font-medium text-muted-foreground">
            Enter PIN to exit
          </p>

          {/* PIN dots */}
          <div
            className={cn(
              "flex justify-center gap-3 pb-4",
              shake && "animate-[shake_0.5s_ease-in-out]"
            )}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-4 w-4 rounded-full transition-all duration-200",
                  i < pin.length ? "bg-primary scale-110" : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {DIGITS.map((d, i) => {
              if (d === "") return <div key={i} />;
              if (d === "back") {
                return (
                  <button
                    key={i}
                    onClick={handleBackspace}
                    className="flex h-12 items-center justify-center rounded-xl text-lg text-muted-foreground hover:bg-muted"
                    aria-label="Backspace"
                  >
                    ←
                  </button>
                );
              }
              return (
                <button
                  key={i}
                  onClick={() => handleDigit(d)}
                  className="flex h-12 items-center justify-center rounded-xl text-xl font-semibold text-foreground hover:bg-muted active:bg-primary/10"
                >
                  {d}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              setPin("");
            }}
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>

        {/* Backdrop */}
        <div
          className="fixed inset-0 -z-10 bg-black/30"
          onClick={() => {
            setIsOpen(false);
            setPin("");
          }}
        />
      </div>
    </>
  );
}
