// Kid mode layout: own route group — no sidebar, no header, completely bare.
// Root auth and app providers are inherited from the main layout.
export default function KidModeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-background">
      {children}
    </div>
  );
}
