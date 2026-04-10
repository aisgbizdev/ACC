export type ActivityScope = "daily" | "monthly" | "quarterly";

const SCOPE_PREFIXES: Array<{ scope: ActivityScope; tag: string }> = [
  { scope: "monthly", tag: "[scope:monthly]" },
  { scope: "quarterly", tag: "[scope:quarterly]" },
  { scope: "daily", tag: "[scope:daily]" },
];

const INPUT_TIME_PREFIX = /^\[time:(\d{2}:\d{2})\]\s*/;

function stripScopePrefix(notes: string): string {
  for (const { tag } of SCOPE_PREFIXES) {
    if (notes.startsWith(tag)) {
      return notes.slice(tag.length).trim();
    }
  }
  return notes;
}

export function stripActivityScopeTag(notes?: string | null): string {
  const raw = (notes ?? "").trim();
  if (!raw) return "";

  const withoutScope = stripScopePrefix(raw);
  const match = withoutScope.match(INPUT_TIME_PREFIX);
  if (match) {
    return withoutScope.slice(match[0].length).trim();
  }
  return withoutScope;
}

export function detectActivityScope(notes?: string | null): ActivityScope {
  const raw = (notes ?? "").trim();
  for (const { scope, tag } of SCOPE_PREFIXES) {
    if (raw.startsWith(tag)) return scope;
  }
  return "daily";
}

export function extractActivityInputTime(notes?: string | null): string | null {
  const raw = (notes ?? "").trim();
  if (!raw) return null;

  const withoutScope = stripScopePrefix(raw);
  const match = withoutScope.match(INPUT_TIME_PREFIX);
  return match?.[1] ?? null;
}
