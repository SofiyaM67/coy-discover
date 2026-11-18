import type { Match, PublicProfile, SwipeAction, SwipeResult } from "@/server/types";

export type { Match, PublicProfile, SwipeAction, SwipeResult };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.code ?? "UNKNOWN", body?.error?.message ?? res.statusText);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  feed: () => request<{ profiles: PublicProfile[] }>("/api/feed").then((r) => r.profiles),
  matches: () => request<{ matches: Match[] }>("/api/matches").then((r) => r.matches),
  swipe: (profileId: string, action: SwipeAction) =>
    request<SwipeResult>("/api/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, action }),
    }),
  markSeen: (profileId: string) =>
    request<void>(`/api/matches/${encodeURIComponent(profileId)}/seen`, { method: "POST" }),
  reset: () => request<void>("/api/reset", { method: "POST" }),
};
