"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/core/utils";

interface PinSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPinSet: (pin: string) => void;
}

export function PinSetupModal({ open, onOpenChange, onPinSet }: PinSetupModalProps) {
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const currentPin = step === "enter" ? pin : confirmPin;
  const setCurrentPin = step === "enter" ? setPin : setConfirmPin;

  function handleDigit(digit: string) {
    if (currentPin.length >= 4) return;
    setCurrentPin(currentPin + digit);
    setError("");
  }

  function handleBackspace() {
    setCurrentPin(currentPin.slice(0, -1));
    setError("");
  }

  function handleSubmit() {
    if (currentPin.length !== 4) return;
    if (step === "enter") {
      setStep("confirm");
      return;
    }
    if (confirmPin !== pin) {
      setError("PINs don't match. Try again.");
      setConfirmPin("");
      return;
    }
    onPinSet(pin);
    setPin("");
    setConfirmPin("");
    setStep("enter");
    setError("");
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setPin("");
      setConfirmPin("");
      setStep("enter");
      setError("");
    }
    onOpenChange(open);
  }

  const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">
            {step === "enter" ? "Set a Kid Mode PIN" : "Confirm your PIN"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === "enter"
              ? "Choose a 4-digit PIN to lock Kid Mode"
              : "Enter the same PIN again to confirm"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-3 py-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-4 w-4 rounded-full transition-all duration-200",
                i < currentPin.length ? "bg-primary scale-110" : "bg-muted"
              )}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        <div className="grid grid-cols-3 gap-2 px-4 pb-2">
          {DIGITS.map((d, i) => {
            if (d === "") return <div key={i} />;
            if (d === "back") {
              return (
                <button
                  key={i}
                  onClick={handleBackspace}
                  className="flex h-14 items-center justify-center rounded-xl text-lg font-medium text-muted-foreground transition-colors hover:bg-muted"
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
                className="flex h-14 items-center justify-center rounded-xl text-xl font-semibold text-foreground transition-colors hover:bg-muted active:bg-primary/10"
              >
                {d}
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={currentPin.length !== 4}
          className="w-full"
        >
          {step === "enter" ? "Next" : "Set PIN"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
