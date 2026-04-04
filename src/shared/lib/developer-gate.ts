function parseAllowlist(raw: string | undefined) {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function canShowDeveloperAccelerators(email: string | null | undefined) {
  if (process.env.NODE_ENV === "production") return false;

  const allowlist = parseAllowlist(process.env.NEXT_PUBLIC_DEVELOPER_ALLOWLIST);

  return !!email && allowlist.has(email.toLowerCase());
}
