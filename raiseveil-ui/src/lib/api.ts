export interface TraderStats {
  tradeCount: string;
  tradeVolume: string;
  averageTradeSize: string;
  averageReturn: string;
  startDate: string;
  lastTradeDate: string;
}

export interface TraderProfile {
  slug: string;
  displayName: string;
  bio: string;
  contractAddress: string | null;
  stats: TraderStats | null;
  observedAt: string | null;
  isPublic?: boolean;
}

export interface DashboardResponse {
  user: { id: string; name: string; email: string };
  profile: TraderProfile;
  broker: { provider: string; connectedAt: string } | null;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}
