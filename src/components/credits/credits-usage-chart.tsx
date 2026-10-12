"use client";

import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from "recharts";

export interface DailyUsageItem {
  date: string;
  label: string;
  spendUSD: number;
  count: number;
}

interface CreditsUsageChartProps {
  data: DailyUsageItem[];
}

export default function CreditsUsageChart({ data }: CreditsUsageChartProps) {
  return (
    <div className="h-64 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
          <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as DailyUsageItem;
                return (
                  <div className="rounded-xl border border-border bg-popover p-2.5 shadow-md text-xs space-y-1">
                    <div className="font-semibold text-foreground">{item.label}</div>
                    <div className="font-mono text-indigo-400">
                      Spend: ${item.spendUSD.toFixed(4)} USD
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Requests: {item.count} prompts
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="spendUSD"
            fill="#6366f1"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
