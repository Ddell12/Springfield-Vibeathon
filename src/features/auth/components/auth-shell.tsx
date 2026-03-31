import { AuthArtPanel } from "./auth-art-panel";

export function AuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto grid w-full max-w-[1180px] gap-10 px-6 pb-20 pt-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:items-center lg:px-10">
      <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
        {children}
      </div>
      <AuthArtPanel />
    </section>
  );
}
