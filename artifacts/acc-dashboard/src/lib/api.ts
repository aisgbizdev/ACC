const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function getBaseUrl(): string {
  return API_BASE ? API_BASE.replace(/\/+$/, "") : "";
}

export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;
  const headers: Record<string, string> = isFormData
    ? {}
    : { "Content-Type": "application/json" };

  const res = await fetch(`${getBaseUrl()}${path}`, {
    credentials: "include",
    headers: {
      ...headers,
      ...(options?.headers ?? {}),
    },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
