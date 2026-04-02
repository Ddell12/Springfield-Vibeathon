export function canShowDeveloperAccelerators(email: string | null | undefined) {
  if (process.env.NODE_ENV === "production") return false;

  const allowlist = new Set(
    (process.env.NEXT_PUBLIC_DEVELOPER_ALLOWLIST ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );

  return !!email && allowlist.has(email.toLowerCase());
}
