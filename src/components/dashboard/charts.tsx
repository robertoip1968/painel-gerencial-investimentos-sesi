import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { contas, execucaoMensal } from "@/lib/dashboard-data";

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };

export function ExecucaoLineChart() {
  const mounted = useMounted();
  if (!mounted) return <div style={{ height: 300 }} />;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={execucaoMensal} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="mes" tick={axis} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
        <YAxis
          tick={axis}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v} Mi`}
          domain={[0, 60]}
        />
        <Tooltip
          formatter={(v: number) => [`R$ ${v.toFixed(2).replace(".", ",")} mi`, ""]}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend
          verticalAlign="top"
          height={32}
          iconType="plainline"
          wrapperStyle={{ fontSize: 12 }}
        />
        <Line
          isAnimationActive={false}
          type="monotone"
          dataKey="previsto"
          name="Previsto Acumulado"
          stroke="var(--chart-1)"
          strokeWidth={2}
          strokeDasharray="6 5"
          dot={false}
        />
        <Line
          isAnimationActive={false}
          type="monotone"
          dataKey="realizado"
          name="Realizado Acumulado"
          stroke="var(--ok)"
          strokeWidth={2.5}
          dot={{ r: 3 }}
          connectNulls={false}
        />
        <Line
          isAnimationActive={false}
          type="monotone"
          dataKey="forecast"
          name="Forecast Acumulado"
          stroke="var(--chart-4)"
          strokeWidth={2}
          strokeDasharray="2 4"
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const palette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--warn)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--crit)",
  "var(--neutral-status)",
  "var(--ok)",
  "var(--muted-foreground)",
];

export function ContasDonut() {
  const mounted = useMounted();
  if (!mounted) return <div style={{ height: 230 }} />;
  const data = contas.filter((c) => c.pct > 0);
  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie isAnimationActive={false} data={data} dataKey="pct" innerRadius={52} outerRadius={92} paddingAngle={1}>
          {data.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} stroke="var(--card)" />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number, _n, p) => [`${String(v).replace(".", ",")}%`, p.payload.nome]}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ExecucaoDonut() {
  const mounted = useMounted();
  if (!mounted) return <div style={{ height: 200 }} />;
  const data = [
    { name: "Realizado", value: 22.19 },
    { name: "A executar", value: 77.81 },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          isAnimationActive={false}
          data={data}
          dataKey="value"
          innerRadius={62}
          outerRadius={86}
          startAngle={90}
          endAngle={-270}
        >
          <Cell fill="var(--chart-1)" stroke="var(--card)" />
          <Cell fill="var(--muted)" stroke="var(--card)" />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
