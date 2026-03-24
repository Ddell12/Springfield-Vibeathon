import { MarketingHeader } from "@/shared/components/marketing-header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarketingHeader />
      <main className="flex-1">{children}</main>
    </>
  );
}
