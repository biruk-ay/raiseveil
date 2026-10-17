import type { DashboardResponse, TraderProfile } from "./api";

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

export const demoTraders: TraderProfile[] = [
  demoDashboard.profile,
  {
    slug: "avery-lane-demo",
    displayName: "Avery Lane",
    bio: "Illustrative demo profile. These figures are fictional.",
    contractAddress: null,
    stats: {
      tradeCount: "94",
      tradeVolume: "$860k",
      averageTradeSize: "$9.1k",
      averageReturn: "2.4%",
      startDate: "2021-09-03",
      lastTradeDate: "2025-01-27",
    },
    observedAt: null,
    isPublic: true,
  },
  {
    slug: "morgan-ellis-demo",
    displayName: "Morgan Ellis",
    bio: "Illustrative demo profile. These figures are fictional.",
    contractAddress: null,
    stats: {
      tradeCount: "312",
      tradeVolume: "$3.1m",
      averageTradeSize: "$9.9k",
      averageReturn: "0.9%",
      startDate: "2020-11-18",
      lastTradeDate: "2025-03-04",
    },
    observedAt: null,
    isPublic: true,
  },
];

export function hasDemoSession(): boolean {
  return window.localStorage.getItem(demoSessionKey) === "active";
}

export function startDemoSession(): void {
  window.localStorage.setItem(demoSessionKey, "active");
}

export function endDemoSession(): void {
  window.localStorage.removeItem(demoSessionKey);
}
