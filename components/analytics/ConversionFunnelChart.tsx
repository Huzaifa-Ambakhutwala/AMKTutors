"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export interface FunnelStage {
  stage: string;
  count: number;
  fill?: string;
}

const COLORS = ["#1A2742", "#2d3a5a", "#3f4d6b", "#5a6b85", "#7a8ba3"];

export default function ConversionFunnelChart({ data }: { data: FunnelStage[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 80, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis type="number" stroke="#6b7280" style={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="stage" stroke="#6b7280" style={{ fontSize: 12 }} width={70} />
        <Tooltip
          contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Count">
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
