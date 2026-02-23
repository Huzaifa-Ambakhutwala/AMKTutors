"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface ProgressDataPoint {
  date: string;
  [key: string]: string | number; // e.g. Math: 85, English: 90
}

interface ProgressChartProps {
  data: ProgressDataPoint[];
  subjects: string[];
  valueLabel?: string;
}

const COLORS = ["#1A2742", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

export default function ProgressChart({ data, subjects, valueLabel = "Score" }: ProgressChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: 12 }} />
        <YAxis stroke="#6b7280" style={{ fontSize: 12 }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}
          formatter={(value) => {
            const n =
              typeof value === "number"
                ? value
                : typeof value === "string"
                  ? Number(value)
                  : 0;
            return [n, valueLabel];
          }}
        />
        <Legend />
        {subjects.map((subject, i) => (
          <Line
            key={subject}
            type="monotone"
            dataKey={subject}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
            name={subject}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
