import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4 px-4">
      <h1 className="font-manrope text-4xl font-bold text-on-surface">
        Page not found
      </h1>
      <p className="text-on-surface-variant text-base">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/" className="text-primary font-medium hover:underline">
        Go back home
      </Link>
    </main>
  );
}
