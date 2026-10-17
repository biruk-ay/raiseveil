import type { DashboardResponse } from "./api";

const demoSessionKey = "raiseveil-demo-session";

export const demoModeEnabled = import.meta.env.VITE_DEMO_MODE === "true";

export const demoDashboard: DashboardResponse = {
  user: {
    id: "demo-user",
    name: "Jordan Rivera",
    email: "demo@raiseveil.app",
  },
  profile: {
    slug: "jordan-rivera-demo",
    displayName: "Jordan Rivera",
    bio: "Sample profile for the RaiseVeil product demo.",
    contractAddress: null,
    stats: {
      tradeCount: "186",
      tradeVolume: "$2.4m",
      averageTradeSize: "$12.9k",
      averageReturn: "1.8%",
      startDate: "2022-04-12",
      lastTradeDate: "2025-02-18",
    },
    observedAt: null,
    isPublic: true,
  },
  broker: null,
};

export function hasDemoSession(): boolean {
  return window.localStorage.getItem(demoSessionKey) === "active";
}

export function startDemoSession(): void {
  window.localStorage.setItem(demoSessionKey, "active");
}

export function endDemoSession(): void {
  window.localStorage.removeItem(demoSessionKey);
}
