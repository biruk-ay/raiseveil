import type { TraderStats } from "../lib/api";

const metrics: Array<{ key: keyof TraderStats; label: string }> = [
  { key: "tradeCount", label: "Verified trades" },
  { key: "tradeVolume", label: "Trade volume" },
  { key: "averageTradeSize", label: "Average trade size" },
  { key: "averageReturn", label: "Average return" },
  { key: "startDate", label: "First trade" },
  { key: "lastTradeDate", label: "Most recent trade" },
];

function formatValue(key: keyof TraderStats, value: string): string {
  if (key === "startDate" || key === "lastTradeDate") {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
  }
  return key === "tradeCount" ? Number(value).toLocaleString() : value;
}

export function StatsGrid({ stats }: { stats: TraderStats }) {
  return (
    <dl className="stats-grid">
      {metrics.map(({ key, label }) => (
        <div className="stats-item" key={key}>
          <dt>{label}</dt>
          <dd className={key === "averageReturn" && valueIsNegative(stats[key]) ? "is-negative" : ""}>
            {formatValue(key, stats[key])}
            {key === "averageReturn" ? <span className="stats-unit"> per trade</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function valueIsNegative(value: string): boolean {
  return value.startsWith("-");
}
