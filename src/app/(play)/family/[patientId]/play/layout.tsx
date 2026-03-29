import { Providers } from "@/core/providers";

// Kid mode layout: own route group — no sidebar, no header, completely bare.
// Must include Providers since this is outside the (app) route group.
export default function KidModeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="fixed inset-0 overflow-y-auto bg-gradient-to-b from-blue-50 to-purple-50 dark:from-zinc-900 dark:to-zinc-950">
        {children}
      </div>
    </Providers>
  );
}
