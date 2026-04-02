"use client";

import { ClipboardList } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/shared/components/ui/sheet";

export interface SessionEvent {
  type: string;
  payloadJson?: string;
  timestamp: number;
}

interface SessionOverlayProps {
  events: SessionEvent[];
  startTimeMs: number;
  toolTitle: string;
  templateType: string;
  onEndSession: () => void;
}

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export function SessionOverlay({
  events, startTimeMs, toolTitle, templateType: _t, onEndSession,
}: SessionOverlayProps) {
  const [open, setOpen] = useState(false);

  const elapsedSec = Math.floor((Date.now() - startTimeMs) / 1000);
  const completions = events.filter((e) => e.type === "activity_completed").length;
  const recentEvents = events.slice(-5).reverse();

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Session controls"
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors">
        <ClipboardList className="w-5 h-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle className="text-left">{toolTitle}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex gap-3">
              <div className="flex flex-col items-center rounded-xl bg-muted/40 px-4 py-3 flex-1">
                <span className="text-2xl font-bold">{events.length} events</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-muted/40 px-4 py-3 flex-1">
                <span className="text-2xl font-bold">{completions}</span>
                <span className="text-xs text-muted-foreground">completions</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-muted/40 px-4 py-3 flex-1">
                <span className="text-sm font-bold">
                  {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, "0")}
                </span>
                <span className="text-xs text-muted-foreground">elapsed</span>
              </div>
            </div>
            {recentEvents.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent</p>
                {recentEvents.map((e, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {e.type.replace(/_/g, " ")} · {relativeTime(e.timestamp)}
                  </p>
                ))}
              </div>
            )}
            <Button variant="destructive" className="w-full"
              onClick={() => { setOpen(false); onEndSession(); }}>
              End session
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
