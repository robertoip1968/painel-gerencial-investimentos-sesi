import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDataset } from "@/lib/dataset-store";
import { areaDoCentroCusto, CORES_AREA } from "@/lib/areas";
import { brl } from "@/lib/dashboard-data";
import { opcoes } from "@/lib/facts";

type Linha = {
  area: string;
  previsto: number;
  realizado: number;
  pct: number;
  saldo: number;
  ccs: string[];
};

/**
 * Execução por Área (agrupamento gerencial de centros de custo).
 * Clicar em uma área aplica o filtro de centros de custo daquela área.
 */
export function ExecucaoPorArea() {
  const { dataset, filtros, setFiltro } = useDataset();

  const linhas = useMemo<Linha[]>(() => {
    const map = new Map<string, Linha>();
    for (const cc of dataset.segCentroCusto) {
      const area = areaDoCentroCusto(cc.nome);
      const cur =
        map.get(area) ?? { area, previsto: 0, realizado: 0, pct: 0, saldo: 0, ccs: [] as string[] };
      cur.previsto += cc.previsto;
      cur.realizado += cc.realizado;
      cur.ccs.push(cc.nome);
      map.set(area, cur);
    }
    return [...map.values()]
      .map((l) => ({
        ...l,
        saldo: l.previsto - l.realizado,
        pct: l.previsto > 0 ? (l.realizado / l.previsto) * 100 : 0,
      }))
      .sort((a, b) => b.previsto - a.previsto);
  }, [dataset]);

  const total = linhas.reduce((a, l) => a + l.previsto, 0);
  const ativa = (l: Linha) =>
    filtros.cc.length > 0 && l.ccs.length > 0 && l.ccs.every((c) => filtros.cc.includes(c));

  const selecionar = (l: Linha) => {
    if (ativa(l)) {
      setFiltro("cc", []);
      return;
    }
    // usa a lista completa de centros de custo da área (não só os do recorte)
    const todos = opcoes.cc.filter((c) => areaDoCentroCusto(c) === l.area);
    setFiltro("cc", todos.length ? todos : l.ccs);
  };

  if (linhas.length === 0) return null;

  const dadosGrafico = linhas.map((l) => ({
    area: l.area,
    previsto: l.previsto / 1_000_000,
    realizado: l.realizado / 1_000_000,
  }));

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-navy">
        Execução por Área
        <span className="ml-1 font-normal normal-case text-muted-foreground">
          (agrupamento de centros de custo — clique para filtrar)
        </span>
      </h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {linhas.map((l) => {
            const on = ativa(l);
            return (
              <button
                key={l.area}
                type="button"
                onClick={() => selecionar(l)}
                className={`rounded-md border p-3 text-left transition ${
                  on
                    ? "border-brand ring-2 ring-brand/40 bg-brand/5"
                    : "border-border hover:border-brand/60 hover:bg-muted/40"
                }`}
              >
                <span
                  className="mb-1 block h-1 w-8 rounded-full"
                  style={{ background: CORES_AREA[l.area] ?? "var(--muted-foreground)" }}
                />
                <p className="text-[11px] font-semibold uppercase text-navy">{l.area}</p>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  Previsto {brl(l.previsto)}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  Realizado {brl(l.realizado)}
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-navy">
                  {l.pct.toFixed(1).replace(".", ",")}% executado
                </p>
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {total > 0 ? ((l.previsto / total) * 100).toFixed(1).replace(".", ",") : "0,0"}% do
                  orçamento
                </p>
              </button>
            );
          })}
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dadosGrafico} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(v: number) => `${v.toFixed(0)} Mi`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="area"
              width={100}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              formatter={(v: number, n: string) => [`R$ ${v.toFixed(2).replace(".", ",")} mi`, n]}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="previsto" name="Previsto" fill="var(--border)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="realizado" name="Realizado" radius={[0, 4, 4, 0]}>
              {dadosGrafico.map((d) => (
                <Cell key={d.area} fill={CORES_AREA[d.area] ?? "var(--muted-foreground)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
