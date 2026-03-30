import { Toaster } from "@/shared/components/ui/sonner";

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
