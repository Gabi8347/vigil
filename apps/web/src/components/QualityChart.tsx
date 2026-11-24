"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

export function QualityChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <div className="chart" aria-hidden="true">
      <ResponsiveContainer height={160} initialDimension={{ width: 440, height: 160 }}>
        <BarChart data={data} layout="vertical" accessibilityLayer={false} margin={{ right: 24 }}>
          <XAxis type="number" allowDecimals={false} hide />
          <YAxis type="category" dataKey="label" width={130} tick={{ fill: "var(--color-text)" }} />
          <Bar dataKey="count" fill="var(--color-accent)" maxBarSize={24} isAnimationActive={false}>
            <LabelList dataKey="count" position="right" fill="var(--color-text)" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
