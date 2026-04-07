export type ActivityScope = "daily" | "monthly" | "quarterly";

const SCOPE_PREFIXES: Array<{ scope: ActivityScope; tag: string }> = [
  { scope: "monthly", tag: "[scope:monthly]" },
  { scope: "quarterly", tag: "[scope:quarterly]" },
  { scope: "daily", tag: "[scope:daily]" },
];

export function stripActivityScopeTag(notes?: string | null): string {
  const raw = (notes ?? "").trim();
  if (!raw) return "";

  for (const { tag } of SCOPE_PREFIXES) {
    if (raw.startsWith(tag)) {
      return raw.slice(tag.length).trim();
    }
  }

  return raw;
}

export function detectActivityScope(notes?: string | null): ActivityScope {
  const raw = (notes ?? "").trim();
  for (const { scope, tag } of SCOPE_PREFIXES) {
    if (raw.startsWith(tag)) return scope;
  }
  return "daily";
}
