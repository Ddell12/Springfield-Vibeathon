"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";

function useIsDesktop(): boolean | undefined {
  const [isDesktop, setIsDesktop] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches); // eslint-disable-line react-hooks/set-state-in-effect -- sync hydration
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

interface DemoToolModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  shareSlug: string;
  prompt: string;
}

function ModalHeader({ title, description, prompt }: { title: string; description: string; prompt: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 bg-surface-container-low sticky top-0 z-10">
      <div className="min-w-0">
        <h2 className="font-headline font-bold text-lg text-on-surface truncate">
          {title}
        </h2>
        <p className="text-on-surface-variant text-sm truncate">
          {description}
        </p>
      </div>
      <Link
        href={`/builder?prompt=${encodeURIComponent(prompt)}`}
        className="shrink-0 ml-4"
      >
        <Button variant="outline" className="font-semibold text-sm">
          Customize This
        </Button>
      </Link>
    </div>
  );
}

function ModalIframe({ shareSlug, title }: { shareSlug: string; title: string }) {
  return (
    <div className="flex-1 bg-surface-container-low">
      <iframe
        src={`/api/tool/${shareSlug}`}
        title={title}
        sandbox="allow-scripts"
        className="w-full h-full border-0"
      />
    </div>
  );
}

export function DemoToolModal({
  open,
  onClose,
  title,
  description,
  shareSlug,
  prompt,
}: DemoToolModalProps) {
  const isDesktop = useIsDesktop();

  // Don't render until client determines viewport — prevents SSR hydration mismatch
  if (isDesktop === undefined) return null;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent
          className={cn(
            "max-w-5xl w-[95vw] h-[90vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl"
          )}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">{description}</DialogDescription>
          <ModalHeader title={title} description={description} prompt={prompt} />
          <ModalIframe shareSlug={shareSlug} title={title} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col gap-0 p-0 rounded-t-2xl">
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <ModalHeader title={title} description={description} prompt={prompt} />
        <ModalIframe shareSlug={shareSlug} title={title} />
      </SheetContent>
    </Sheet>
  );
}
