interface Stat {
  label: string;
  value: string | number;
}

export function StatsBar({ stats }: { stats: Stat[] }) {
  return (
    <div className="flex gap-6 mt-3 flex-wrap">
      {stats.map((s) => (
        <div key={s.label} className="text-center">
          <div className="text-xl font-bold text-[#1a1a2e]">{s.value}</div>
          <div className="text-[11px] text-gray-500 uppercase tracking-wide mt-0.5">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
