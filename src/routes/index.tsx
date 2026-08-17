import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUp,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Coins,
  Database,
  FileText,
  Filter,
  Info,
  MinusCircle,
  PieChart as PieIcon,
  RotateCcw,
  Target,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import { ContasDonut, ExecucaoDonut, ExecucaoLineChart } from "@/components/dashboard/charts";
import { VisaoSegmentada } from "@/components/dashboard/segmentado";
import { CsvUpload } from "@/components/dashboard/csv-upload";
import { DatasetProvider, useDataset } from "@/lib/dataset-store";
import { kpisFromDataset } from "@/lib/kpi-from-dataset";
import { brl } from "@/lib/dashboard-data";
import {
  ANO,
  MESES,
  centrosTop,
  contasPct,
  forecastAno,
  maioresSaldos,
  mesBase,
  mi,
  pctFmt,
  receita,
  respostasFrom,
  riscoResumo,
  ritmos,
  serieAcumulada,
} from "@/lib/real-data";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel Gerencial de Investimentos – SESI MT" },
      {
        name: "description",
        content:
          "Visão executiva da execução orçamentária de investimentos do SESI MT — previsto, comprometido, realizado, forecast e riscos, Jan a Jun/2026.",
      },
      { property: "og:title", content: "Painel Gerencial de Investimentos – SESI MT" },
      {
        property: "og:description",
        content:
          "Execução orçamentária de investimentos: KPIs, curva previsto x realizado, centros de custo e análise de risco.",
      },
    ],
  }),
  component: Dashboard,
});

const kpiIcons = {
  coins: Coins,
  file: FileText,
  check: CheckCircle2,
  pie: PieIcon,
  wallet: Wallet,
  trend: TrendingUp,
  target: Target,
} as const;

const dotClass = { ok: "bg-ok", warn: "bg-warn", crit: "bg-crit" } as const;

function Panel({
  title,
  hint,
  className,
  children,
}: {
  title: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border border-border bg-card p-4 shadow-sm ${className ?? ""}`}
    >
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-navy">
        {title}
        {hint ? <span className="ml-1 font-normal normal-case text-muted-foreground">{hint}</span> : null}
      </h2>
      {children}
    </section>
  );
}

function Filtro({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground">
        <span className="truncate">{value}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <DatasetProvider>
      <DashboardInner />
    </DatasetProvider>
  );
}

function DashboardInner() {
  const { dataset, isUpload } = useDataset();
  const kpis = kpisFromDataset(dataset);
  const mb = mesBase(dataset);
  const periodo = `${MESES[0]} - ${MESES[mb - 1]}`;
  const serie = serieAcumulada(dataset);
  const contas = contasPct(dataset);
  const cc = centrosTop(dataset);
  const saldos = maioresSaldos(dataset);
  const risco = riscoResumo(dataset);
  const respostas = respostasFrom(dataset);
  const { media, necessario } = ritmos(dataset);
  const execPct = dataset.previsto > 0 ? (dataset.realizado / dataset.previsto) * 100 : 0;
  const saldoTop = saldos.reduce((a, s) => a + s.saldo, 0);
  return (
    <div className="min-h-screen bg-panel pb-0 text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-navy px-6 py-4 text-navy-foreground">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-extrabold italic tracking-tight">SESI MT</span>
          <div className="h-9 w-px bg-navy-foreground/25" />
          <div>
            <h1 className="text-lg font-bold uppercase leading-tight sm:text-xl">
              Painel Gerencial de Investimentos – SESI MT
            </h1>
            <p className="text-sm text-navy-foreground/70">
              Visão Executiva – {periodo}/{ANO} • {isUpload ? dataset.fileName : "Base SHIFT 2026"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-xs text-navy-foreground/70">
            <div>Última atualização:</div>
            <div className="text-sm text-navy-foreground">13/08/2026 08:30</div>
          </div>
          <button className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90">
            <Filter className="size-4" /> Filtros <ChevronDown className="size-4" />
          </button>
        </div>
      </header>

      <main className="space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-1 items-end gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-7">
          <Filtro label="Ano" value={String(ANO)} />
          <Filtro label="Período" value={periodo} />
          <Filtro label="Área / Gerência" value="Todos" />
          <Filtro label="Centro de Custo" value="Todos" />
          <Filtro label="Conta Contábil" value="Todos" />
          <Filtro label="Unidade" value="Todas" />
          <button className="flex items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90">
            <RotateCcw className="size-4" /> Limpar filtros
          </button>
        </div>

        <CsvUpload />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {kpis.map((k) => {
            const Icon = kpiIcons[k.icon];
            return (
              <div
                key={k.label}
                className="rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Icon
                    className={`size-8 shrink-0 ${"negative" in k && k.negative ? "text-crit" : "text-brand"}`}
                    strokeWidth={1.6}
                  />
                  <div>
                    <p
                      className={`text-xl font-bold leading-none ${"negative" in k && k.negative ? "text-crit" : "text-navy"}`}
                    >
                      {k.value}
                    </p>
                    <p
                      className={`mt-1 text-[11px] ${"negative" in k && k.negative ? "text-crit" : "text-muted-foreground"}`}
                    >
                      {k.sub}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-navy">
            Leitura Rápida
            <span className="ml-1 font-normal normal-case text-muted-foreground">
              (visão geral do exercício)
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {respostas.map((r) => {
              const tone = {
                brand: "border-l-brand",
                ok: "border-l-ok",
                warn: "border-l-warn",
                crit: "border-l-crit",
              }[r.tone];
              const text = {
                brand: "text-navy",
                ok: "text-ok",
                warn: "text-warn",
                crit: "text-crit",
              }[r.tone];
              return (
                <div
                  key={r.pergunta}
                  className={`rounded-md border border-border border-l-4 ${tone} bg-muted/40 p-3`}
                >
                  <p className="text-[11px] font-medium text-muted-foreground">{r.pergunta}</p>
                  <p className={`mt-1.5 text-sm font-bold leading-tight ${text}`}>{r.resposta}</p>
                  <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{r.detalhe}</p>
                </div>
              );
            })}
          </div>
        </section>


        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Panel title={`Execução ${periodo}/${ANO}`} className="xl:col-span-3">
            <div className="relative">
              <ExecucaoDonut pct={execPct} />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-navy">{pctFmt(dataset.realizado, dataset.previsto)}</span>
                <span className="text-xs text-muted-foreground">do orçamento anual</span>
              </div>
            </div>
            <div className="mt-3 rounded-md bg-muted px-4 py-3 text-center">
              <p className="text-lg font-bold text-navy">{mi(dataset.realizado)}</p>
              <p className="text-xs text-muted-foreground">Realizado no período</p>
            </div>
            <div className="mt-3 text-center text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">{mi(dataset.previsto)}</p>
              <p>Orçamento anual</p>
            </div>
          </Panel>

          <Panel
            title="Comportamento da Execução – Previsto x Realizado"
            hint="(acumulado)"
            className="xl:col-span-6"
          >
            <ExecucaoLineChart data={serie} />
            <div className="mt-2 inline-block rounded-md border border-border bg-muted/60 px-3 py-2 text-xs text-foreground">
              <p>
                Ritmo necessário ({MESES[mb] ?? "—"}-{MESES[11]}): <strong>{mi(necessario)}/mês</strong>
              </p>
              <p>
                Média realizada ({MESES[0]}-{MESES[mb - 1]}): <strong>{mi(media)}/mês</strong>
              </p>
            </div>
          </Panel>

          <Panel title="Distribuição do Orçamento por Conta Contábil" className="xl:col-span-3">
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <div className="w-full sm:w-[45%]">
                <ContasDonut contas={contas} />
              </div>
              <ul className="w-full space-y-1.5 text-[11px] sm:w-[55%]">
                {contas.map((c, i) => (
                  <li key={c.nome} className="flex items-start gap-2">
                    <span
                      className="mt-1 size-2.5 shrink-0 rounded-[2px]"
                      style={{
                        background: [
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
                        ][i],
                      }}
                    />
                    <span className="w-10 shrink-0 font-semibold text-foreground">
                      {c.pct.toFixed(1).replace(".", ",")}%
                    </span>
                    <span className="text-muted-foreground">{c.nome}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3 text-sm font-semibold text-navy">Total: {mi(dataset.previsto)}</p>
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Panel title="Execução por Centro de Custo" hint="(Top 10)" className="xl:col-span-5">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="w-6 py-2 font-medium"></th>
                    <th className="py-2 font-medium">Centro de Custo</th>
                    <th className="py-2 text-right font-medium">Previsto (R$)</th>
                    <th className="py-2 text-right font-medium">Realizado (R$)</th>
                    <th className="py-2 text-right font-medium">% Execução</th>
                    <th className="py-2 text-right font-medium">Saldo (R$)</th>
                    <th className="py-2 text-center font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {cc.linhas.map((r, i) => (
                    <tr key={r.cc} className="border-b border-border/60">
                      <td className="py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="py-1.5">{r.cc}</td>
                      <td className="py-1.5 text-right tabular-nums">{brl(r.previsto)}</td>
                      <td className="py-1.5 text-right tabular-nums">{brl(r.realizado)}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.pct}</td>
                      <td className="py-1.5 text-right tabular-nums">{brl(r.saldo)}</td>
                      <td className="py-1.5">
                        <span
                          className={`mx-auto block size-2.5 rounded-full ${dotClass[r.situacao]}`}
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold text-navy">
                    <td className="py-2"></td>
                    <td className="py-2">TOTAL</td>
                    <td className="py-2 text-right tabular-nums">{brl(cc.total.previsto)}</td>
                    <td className="py-2 text-right tabular-nums">{brl(cc.total.realizado)}</td>
                    <td className="py-2 text-right tabular-nums">{cc.total.pct}</td>
                    <td className="py-2 text-right tabular-nums">{brl(cc.total.saldo)}</td>
                    <td className="py-2">
                      <span className="mx-auto block size-2.5 rounded-full bg-crit" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Top 10 Maiores Saldos a Executar" className="xl:col-span-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">Item / Investimento</th>
                    <th className="py-2 font-medium">Centro de Custo</th>
                    <th className="py-2 text-right font-medium">Saldo (R$)</th>
                    <th className="py-2 text-right font-medium">% do Saldo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {saldos.map((r) => (
                    <tr key={r.item} className="border-b border-border/60">
                      <td className="py-1.5">{r.item}</td>
                      <td className="py-1.5 text-muted-foreground">{r.cc}</td>
                      <td className="py-1.5 text-right tabular-nums">{brl(r.saldo)}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.pct}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold text-navy">
                    <td className="py-2" colSpan={2}>
                      TOTAL TOP 10
                    </td>
                    <td className="py-2 text-right tabular-nums">{brl(saldoTop)}</td>
                    <td className="py-2 text-right tabular-nums">{pctFmt(saldoTop, dataset.previsto - dataset.realizado)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Análise de Risco da Execução" className="xl:col-span-3">
            <div className="grid grid-cols-2 gap-3">
              {risco.map((r) => {
                const tone = {
                  ok: { border: "border-ok/40", bg: "bg-ok/5", text: "text-ok", Icon: CheckCircle2 },
                  warn: {
                    border: "border-warn/50",
                    bg: "bg-warn/10",
                    text: "text-warn",
                    Icon: AlertTriangle,
                  },
                  crit: {
                    border: "border-crit/40",
                    bg: "bg-crit/5",
                    text: "text-crit",
                    Icon: AlertTriangle,
                  },
                  neutral: {
                    border: "border-border",
                    bg: "bg-muted/50",
                    text: "text-muted-foreground",
                    Icon: Ban,
                  },
                }[r.tone];
                return (
                  <div
                    key={r.titulo}
                    className={`rounded-md border ${tone.border} ${tone.bg} p-3 text-center`}
                  >
                    <p
                      className={`text-[11px] font-bold uppercase tracking-wide ${tone.text}`}
                    >
                      {r.titulo}
                    </p>
                    <tone.Icon className={`mx-auto my-2 size-7 ${tone.text}`} strokeWidth={2} />
                    <p className="text-2xl font-bold text-navy">{r.qtd}</p>
                    <p className="text-[10px] text-muted-foreground">{r.unidade}</p>
                    <p className="mt-1.5 text-sm font-semibold text-navy">{r.valor}</p>
                    <p className="text-[10px] text-muted-foreground">{r.sub}</p>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        <VisaoSegmentada />


        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel title="Destaques e Alertas">
            <ul className="space-y-2.5 text-xs">
              <li className="flex gap-2">
                <span className="mt-1 size-2.5 shrink-0 rounded-full bg-crit" />
                <span>
                  <strong>9</strong> Centros de Custo com execução abaixo de 15% e saldo superior a
                  R$ 1 milhão.
                </span>
              </li>
              <li className="flex gap-2">
                <MinusCircle className="mt-px size-3.5 shrink-0 text-crit" />
                <span>
                  <strong>6</strong> Itens de investimento sem execução até o momento.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 size-2.5 shrink-0 rounded-full bg-warn" />
                <span>
                  <strong>63%</strong> do saldo a executar está concentrado nos 8 maiores
                  investimentos.
                </span>
              </li>
              <li className="flex gap-2">
                <Info className="mt-px size-3.5 shrink-0 text-brand" />
                <span>Ritmo médio necessário (Jul-Dez): R$ 6,84 mi/mês.</span>
              </li>
            </ul>
          </Panel>

          <Panel title="Comparativo Mesmo Período Ano Anterior">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 text-left font-medium"></th>
                  <th className="py-2 text-right font-medium">Jan - Jun/2025 (R$)</th>
                  <th className="py-2 text-right font-medium">Jan - Jun/2026 (R$)</th>
                  <th className="py-2 text-right font-medium">Variação</th>
                </tr>
              </thead>
              <tbody>
                {comparativo.map((c) => (
                  <tr key={c.linha} className="border-b border-border/60">
                    <td className="py-2">{c.linha}</td>
                    <td className="py-2 text-right tabular-nums">{c.a2025}</td>
                    <td className="py-2 text-right tabular-nums">{c.a2026}</td>
                    <td className="py-2 text-right tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        {c.var}
                        {c.dir === "up" ? (
                          <ArrowUp className="size-3.5 text-ok" />
                        ) : (
                          <MinusCircle className="size-3.5 text-muted-foreground" />
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Informações Gerais">
            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <div className="flex gap-2">
                <Database className="size-4 shrink-0 text-brand" />
                <div>
                  <p className="font-semibold">Fonte de dados:</p>
                  <p className="text-muted-foreground">SHIFT – Gestão Corporativa</p>
                </div>
              </div>
              <div className="flex gap-2">
                <CircleDollarSign className="size-4 shrink-0 text-brand" />
                <div>
                  <p className="font-semibold">Moeda:</p>
                  <p className="text-muted-foreground">Real (R$)</p>
                </div>
              </div>
              <div className="flex gap-2">
                <User className="size-4 shrink-0 text-brand" />
                <div>
                  <p className="font-semibold">Responsável:</p>
                  <p className="text-muted-foreground">Gerência de Desenvolvimento de Negócio</p>
                </div>
              </div>
              <div className="flex gap-2">
                <CalendarDays className="size-4 shrink-0 text-brand" />
                <div>
                  <p className="font-semibold">Data base:</p>
                  <p className="text-muted-foreground">Até 30/06/2026</p>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-2 bg-navy px-6 py-3 text-xs text-navy-foreground/80">
        <span>Painel Gerencial de Investimentos – SESI MT</span>
        <span>Gerência de Desenvolvimento de Negócio</span>
        <span className="font-semibold text-navy-foreground">SESI MT | Transformando vidas</span>
      </footer>
    </div>
  );
}
