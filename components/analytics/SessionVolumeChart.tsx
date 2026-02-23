"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface SessionVolumePoint {
  label: string;
  sessions: number;
  completed?: number;
}

export default function SessionVolumeChart({ data }: { data: SessionVolumePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" stroke="#6b7280" style={{ fontSize: 12 }} />
        <YAxis stroke="#6b7280" style={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}
        />
        <Bar dataKey="sessions" fill="#1A2742" radius={[6, 6, 0, 0]} name="Sessions" />
      </BarChart>
    </ResponsiveContainer>
  );
}
