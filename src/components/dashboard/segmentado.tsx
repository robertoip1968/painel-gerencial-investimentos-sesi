import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Layers, ListTree, Wallet } from "lucide-react";
import { brl, type SegRow } from "@/lib/dashboard-data";
import { useDataset } from "@/lib/dataset-store";
import { MESES, mesBase } from "@/lib/real-data";

type Ordem = "previsto" | "saldo" | "desvio";

const pct = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function derive(r: SegRow, meta: number) {
  const saldo = r.previsto - r.realizado;
  const disponivel = r.previsto - r.comprometido - r.realizado;
  const execPct = r.previsto > 0 ? (r.realizado / r.previsto) * 100 : 0;
  const desvio = execPct - meta; // p.p. contra a meta linear do período
  const situacao =
    r.previsto === 0
      ? "none"
      : execPct >= meta * 0.9
        ? "ok"
        : execPct >= meta * 0.6
          ? "warn"
          : "crit";
  return { ...r, saldo, disponivel, execPct, desvio, situacao };
}

const dotClass = {
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
  none: "bg-muted-foreground",
} as const;

const riscoLabel = {
  ok: "Em dia",
  warn: "Atenção",
  crit: "Crítico",
  semexec: "Sem execução",
} as const;

export function VisaoSegmentada() {
  const mounted = useMounted();
  const { dataset, risco, setRisco } = useDataset();
  const [dim, setDim] = useState<"cc" | "item" | "conta">("cc");
  const [ordem, setOrdem] = useState<Ordem>("previsto");
  const [busca, setBusca] = useState("");
  const mb = mesBase(dataset);
  const META_EXEC_PCT = Math.round((mb / 12) * 100);

  const dimensoes = useMemo(
    () =>
      [
        {
          id: "cc" as const,
          label: "Centro de Custo",
          icon: Layers,
          rows: dataset.segCentroCusto,
          colLabel: "Centro de Custo",
        },
        {
          id: "item" as const,
          label: "Item Contábil",
          icon: ListTree,
          rows: dataset.segItem,
          colLabel: "Item",
        },
        {
          id: "conta" as const,
          label: "Conta Contábil",
          icon: Wallet,
          rows: dataset.segConta,
          colLabel: "Conta Contábil",
        },
      ],
    [dataset],
  );

  const dimEfetiva = risco ? (risco === "semexec" ? "item" : "cc") : dim;
  const ativa = dimensoes.find((d) => d.id === dimEfetiva)!;

  const rows = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const d = ativa.rows
      .filter((r) => !q || r.nome.toLowerCase().includes(q) || r.grupo.toLowerCase().includes(q))
      .map((r) => derive(r, META_EXEC_PCT))
      .filter((r) =>
        !risco
          ? true
          : risco === "semexec"
            ? r.previsto > 0 && r.realizado === 0
            : r.situacao === risco,
      );
    return [...d].sort((a, b) =>
      ordem === "previsto" ? b.previsto - a.previsto : ordem === "saldo" ? b.saldo - a.saldo : a.desvio - b.desvio,
    );
  }, [ativa, ordem, busca, META_EXEC_PCT, risco]);

  const visiveis = rows.slice(0, 25);

  const totais = rows.reduce(
    (acc, r) => ({
      previsto: acc.previsto + r.previsto,
      realizado: acc.realizado + r.realizado,
      comprometido: acc.comprometido + r.comprometido,
      saldo: acc.saldo + r.saldo,
    }),
    { previsto: 0, realizado: 0, comprometido: 0, saldo: 0 },
  );

  const chartData = rows.slice(0, 8).map((r) => ({
    nome: r.nome.length > 26 ? `${r.nome.slice(0, 25)}…` : r.nome,
    Realizado: +(r.realizado / 1_000_000).toFixed(2),
    "Saldo a executar": +(r.saldo / 1_000_000).toFixed(2),
    execPct: r.execPct,
  }));

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-navy">
          Visão Segmentada
          <span className="ml-1 font-normal normal-case text-muted-foreground">
            (direcionadores de leitura)
          </span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            {dimensoes.map((d) => (
              <button
                key={d.id}
                onClick={() => setDim(d.id)}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  dim === d.id
                    ? "bg-navy text-navy-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <d.icon className="size-3.5" />
                {d.label}
              </button>
            ))}
          </div>
          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as Ordem)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            aria-label="Ordenar por"
          >
            <option value="previsto">Ordenar: maior previsto</option>
            <option value="saldo">Ordenar: maior saldo</option>
            <option value="desvio">Ordenar: maior desvio</option>
          </select>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar…"
            aria-label="Buscar"
            className="w-40 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Top 8 por {ordem === "desvio" ? "desvio" : ordem} – Realizado x Saldo (R$ mi)
          </p>
          {mounted ? (
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={150}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  formatter={(v: number, n: string) => [`R$ ${v} mi`, n]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                />
                <Bar dataKey="Realizado" stackId="a" fill="var(--brand)" isAnimationActive={false} />
                <Bar dataKey="Saldo a executar" stackId="a" isAnimationActive={false}>
                  {chartData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.execPct >= 40 ? "var(--ok)" : d.execPct >= 20 ? "var(--warn)" : "var(--crit)"}
                      fillOpacity={0.35}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 330 }} />
          )}
        </div>

        <div className="overflow-x-auto xl:col-span-7">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">{ativa.colLabel}</th>
                <th className="py-2 text-right font-medium">Previsto</th>
                <th className="py-2 text-right font-medium">Comprometido</th>
                <th className="py-2 text-right font-medium">Realizado</th>
                <th className="py-2 text-right font-medium">% Exec.</th>
                <th className="py-2 text-right font-medium">Desvio (p.p.)</th>
                <th className="py-2 text-right font-medium">Saldo</th>
                <th className="py-2 text-center font-medium">Sit.</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((r) => (
                <tr key={r.nome} className="border-b border-border/60">
                  <td className="py-1.5">
                    <span className="block leading-tight">{r.nome}</span>
                    <span className="text-[10px] text-muted-foreground">{r.grupo}</span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{brl(r.previsto)}</td>
                  <td className="py-1.5 text-right tabular-nums">{brl(r.comprometido)}</td>
                  <td className="py-1.5 text-right tabular-nums">{brl(r.realizado)}</td>
                  <td className="py-1.5 text-right tabular-nums">{pct(r.execPct)}</td>
                  <td
                    className={`py-1.5 text-right tabular-nums ${
                      r.desvio < -20 ? "font-semibold text-crit" : r.desvio < 0 ? "text-warn" : "text-ok"
                    }`}
                  >
                    <span className="inline-flex items-center justify-end gap-1">
                      {r.desvio >= 0 ? (
                        <ArrowUpRight className="size-3" />
                      ) : (
                        <ArrowDownRight className="size-3" />
                      )}
                      {r.desvio.toFixed(1).replace(".", ",")}
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{brl(r.saldo)}</td>
                  <td className="py-1.5">
                    <span
                      className={`mx-auto block size-2.5 rounded-full ${dotClass[r.situacao as keyof typeof dotClass]}`}
                    />
                  </td>
                </tr>
              ))}
              <tr className="font-semibold text-navy">
                <td className="py-2">TOTAL</td>
                <td className="py-2 text-right tabular-nums">{brl(totais.previsto)}</td>
                <td className="py-2 text-right tabular-nums">{brl(totais.comprometido)}</td>
                <td className="py-2 text-right tabular-nums">{brl(totais.realizado)}</td>
                <td className="py-2 text-right tabular-nums">
                  {pct((totais.realizado / totais.previsto) * 100)}
                </td>
                <td className="py-2 text-right tabular-nums text-crit">
                  {((totais.realizado / totais.previsto) * 100 - META_EXEC_PCT)
                    .toFixed(1)
                    .replace(".", ",")}
                </td>
                <td className="py-2 text-right tabular-nums">{brl(totais.saldo)}</td>
                <td className="py-2" />
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Exibindo {visiveis.length} de {rows.length} registros. Desvio = % executado menos a meta
            linear do período ({META_EXEC_PCT}% até {MESES[mb - 1]}). Situação: verde ≥ 90% da meta,
            amarelo 60–90%, vermelho &lt; 60%.
          </p>
        </div>
      </div>
    </section>
  );
}
