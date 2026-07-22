"use client";

interface FunnelChartProps {
  data: { status: string; count: number }[];
}

export function FunnelChart({ data }: FunnelChartProps) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.status}>
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>{item.status}</span>
            <span>{item.count}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
