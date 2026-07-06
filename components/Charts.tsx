"use client";

import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BalancePoint, CategoryPoint } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function TrendLineChart({ data }: { data: BalancePoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: -18, right: 8, top: 10, bottom: 0 }}>
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis hide domain={["dataMin - 50000", "dataMax + 50000"]} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={(label) => `Día ${label}`} />
          <Line type="monotone" dataKey="balance" stroke="#0A84FF" strokeWidth={4} dot={false} />
          <Line type="monotone" dataKey="projected" stroke="#FF9F0A" strokeWidth={3} strokeDasharray="6 6" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDonut({ data }: { data: CategoryPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
