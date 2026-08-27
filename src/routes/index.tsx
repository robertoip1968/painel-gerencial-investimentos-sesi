import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { getSessao, sair } from "@/lib/auth-local";
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
import { AtualizarBase } from "@/components/dashboard/atualizar-base";
import { LancamentosConta } from "@/components/dashboard/lancamentos";
import { AssistenteVirtual } from "@/components/dashboard/assistente";
import { DatasetProvider, useDataset } from "@/lib/dataset-store";
import { kpisFromDataset } from "@/lib/kpi-from-dataset";
import { brl } from "@/lib/dashboard-data";
import {
  ANO,
  MESES,
  centrosTop,
  contasPct,
  maioresSaldos,
  mesBase,
  mesUltimoDado,
  mi,
  pctFmt,
  respostasFrom,
  riscoResumo,
  ritmos,
  serieAcumulada,
} from "@/lib/real-data";
import { TODOS, opcoes, type Filtros } from "@/lib/facts";



const LOGO_URL = "/assets/fiemt-sesi-logo.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel Gerencial de Investimentos – SESI MT" },
      {
        name: "description",
        content:
          "Visão executiva da execução orçamentária de investimentos do SESI MT — previsto, realizado, forecast e riscos por centro de custo, item e conta contábil.",
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

function Filtro({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="relative mt-1">
        <select
          value={value}
          disabled={disabled || !onChange}
          onChange={(e) => onChange?.(e.target.value)}
          aria-label={label}
          className="w-full appearance-none truncate rounded-md border border-border bg-background px-3 py-1.5 pr-8 text-sm text-foreground disabled:opacity-70"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

function MultiFiltro({
  label,
  todos,
  options,
  value,
  onChange,
}: {
  label: string;
  todos: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const ativo = value.length > 0;

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  const q = busca.trim().toLowerCase();
  const visiveis = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  const alternar = (o: string) =>
    onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);

  const resumo = !ativo
    ? todos
    : value.length === 1
      ? value[0]!
      : `${value.length} selecionados`;

  return (
    <div className="min-w-0" ref={ref}>
      <span
        className={`text-[11px] font-medium ${ativo ? "text-brand" : "text-muted-foreground"}`}
      >
        {label}
        {ativo ? ` • ${value.length}` : ""}
      </span>
      <div className="relative mt-1">
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-label={label}
          aria-expanded={aberto}
          className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-left text-sm ${
            ativo
              ? "border-brand bg-brand/10 font-medium text-brand"
              : "border-border bg-background text-foreground"
          }`}
        >
          <span className="truncate">{resumo}</span>
          <ChevronDown className="size-4 shrink-0 opacity-70" />
        </button>
        {aberto && (
          <div className="absolute z-30 mt-1 max-h-80 w-[min(24rem,80vw)] overflow-hidden rounded-md border border-border bg-card shadow-lg">
            <div className="border-b border-border p-2">
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar…"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              />
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  className="font-medium text-brand hover:underline"
                  onClick={() => onChange(Array.from(new Set([...value, ...visiveis])))}
                >
                  Selecionar tudo
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:underline"
                  onClick={() => onChange([])}
                >
                  Limpar
                </button>
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {visiveis.length === 0 && (
                <p className="p-2 text-xs text-muted-foreground">Nenhum resultado.</p>
              )}
              {visiveis.slice(0, 500).map((o) => (
                <label
                  key={o}
                  className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(o)}
                    onChange={() => alternar(o)}
                    className="mt-0.5 size-3.5 accent-[var(--brand)]"
                  />
                  <span className="leading-snug">{o}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const mesOpts = MESES.map((m, i) => ({ value: String(i + 1), label: m }));



function Dashboard() {
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    void getSessao().then((s) => {
      if (s) setOk(true);
      else void navigate({ to: "/login", replace: true });
    });
  }, [navigate]);

  if (!ok) return <div className="min-h-screen bg-panel" />;


  return (
    <DatasetProvider>
      <DashboardInner />
      <AssistenteVirtual />
    </DatasetProvider>

  );
}

function DashboardInner() {
  const navigate = useNavigate();
  const {
    dataset,
    carregando,
    erroDados,
    fonte,

    filtros,
    setFiltro,
    limparFiltros,
    temFiltro,
    receita,
    risco: riscoSel,
    setRisco,
  } = useDataset();
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const kpis = kpisFromDataset(dataset);
  const mb = mesBase(dataset);
  const mUlt = mesUltimoDado(dataset);
  const periodo = `${MESES[filtros.mesIni - 1]} - ${MESES[Math.max(filtros.mesIni - 1, mUlt - 1)]}`;
  const num = (k: keyof Filtros) => (v: string) => setFiltro(k as "mesIni", Number(v));

  const serie = serieAcumulada(dataset);
  const contas = contasPct(dataset);
  const cc = centrosTop(dataset);
  const saldos = maioresSaldos(dataset);
  const risco = riscoResumo(dataset);
  const respostas = respostasFrom(dataset);
  const { media, necessario } = ritmos(dataset);
  const execPct = dataset.previsto > 0 ? (dataset.realizado / dataset.previsto) * 100 : 0;
  const saldoTop = saldos.reduce((a, s) => a + s.saldo, 0);

  // Em produção nenhum KPI/gráfico é renderizado enquanto o PostgreSQL carrega.
  if (!import.meta.env.DEV && carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-panel p-6 text-foreground">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
          <span className="size-3 animate-pulse rounded-full bg-brand" />
          Carregando dados oficiais…
        </div>
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-panel pb-0 text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-navy px-6 py-4 text-navy-foreground">
        <div className="flex items-center gap-4">
          <img
            src={LOGO_URL}
            alt="FIEMT SESI MT – 50 anos"
            className="h-11 w-auto rounded-md bg-white px-2 py-1"
          />
          <div className="h-9 w-px bg-navy-foreground/25" />
          <div>
            <h1 className="text-lg font-bold uppercase leading-tight sm:text-xl">
              Painel Gerencial de Investimentos – SESI MT
            </h1>
            <p className="text-sm text-navy-foreground/70">
              Visão Executiva – {periodo}/{ANO()} • {fonte === "db" ? "PostgreSQL • dash_sesi" : "Base SHIFT 2026"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-xs text-navy-foreground/70">
            <div>Última atualização:</div>
            <div className="text-sm text-navy-foreground">{dataset.linhas.toLocaleString("pt-BR")} lançamentos</div>
          </div>
          <button
            type="button"
            aria-expanded={filtrosAbertos}
            aria-controls="filtros"
            onClick={() => {
              const abrir = !filtrosAbertos;
              setFiltrosAbertos(abrir);
              if (abrir) {
                requestAnimationFrame(() =>
                  document.getElementById("filtros")?.scrollIntoView({ behavior: "smooth", block: "center" }),
                );
              }
            }}
            className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90"
          >
            <Filter className="size-4" /> Filtros
            <ChevronDown
              className={`size-4 transition-transform ${filtrosAbertos ? "rotate-180" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              void sair();
              void navigate({ to: "/login", replace: true });
            }}
            className="flex items-center gap-2 rounded-md border border-navy-foreground/25 px-3 py-2 text-sm font-medium text-navy-foreground/80 transition-colors hover:bg-navy-foreground/10"
          >
            <LogOut className="size-4" /> Sair
          </button>

        </div>
      </header>

      <main className="space-y-4 p-4 sm:p-6">
        <div
          id="filtros"
          hidden={!filtrosAbertos}
          className="grid grid-cols-1 items-end gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-6"
        >
          <Filtro label="Ano" value={String(ANO())} options={[{ value: String(ANO()), label: String(ANO()) }]} />
          <Filtro
            label="Mês inicial"
            value={String(filtros.mesIni)}
            onChange={num("mesIni")}
            options={mesOpts}
          />
          <Filtro
            label="Mês final"
            value={String(filtros.mesFim)}
            onChange={num("mesFim")}
            options={mesOpts}
          />
          <Filtro
            label="Centro de Custo"
            value={filtros.cc}
            onChange={(v) => setFiltro("cc", v)}
            options={listOpts(opcoes.cc, "Todos")}
          />
          <Filtro
            label="Item Contábil"
            value={filtros.item}
            onChange={(v) => setFiltro("item", v)}
            options={listOpts(opcoes.item, "Todos")}
          />
          <Filtro
            label="Conta Contábil"
            value={filtros.conta}
            onChange={(v) => setFiltro("conta", v)}
            options={listOpts(opcoes.conta, "Todas")}
          />
          <div className="flex items-center gap-3 sm:col-span-3 lg:col-span-6">
            <button
              type="button"
              onClick={limparFiltros}
              disabled={!temFiltro}
              className="flex items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-50"
            >
              <RotateCcw className="size-4" /> Limpar filtros
            </button>
            <span className="text-xs text-muted-foreground">
              {temFiltro
                  ? `Filtro ativo • ${dataset.linhas.toLocaleString("pt-BR")} lançamentos`
                  : "Nenhum filtro aplicado."}
            </span>
          </div>
        </div>

        {carregando ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            <span className="size-3 animate-pulse rounded-full bg-brand" />
            Carregando dados oficiais do PostgreSQL…
          </div>
        ) : null}

        {!carregando && erroDados ? (
          <div className="flex items-start gap-2 rounded-lg border border-crit/40 bg-crit/10 p-4 text-sm text-crit">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">{erroDados}</p>
              <p className="text-crit/80">
                Os indicadores permanecem zerados até que os dados oficiais sejam carregados.
              </p>
            </div>
          </div>
        ) : null}


        <AtualizarBase />



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
          <Panel title={`Execução ${periodo}/${ANO()}`} className="xl:col-span-3">
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
                const alvo = r.tone === "neutral" ? "semexec" : r.tone;
                return (
                  <button
                    key={r.titulo}
                    type="button"
                    onClick={() => {
                      setRisco(riscoSel === alvo ? null : alvo);
                      document
                        .getElementById("segmentado")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`rounded-md border ${tone.border} ${tone.bg} p-3 text-center transition-shadow hover:shadow-md ${
                      riscoSel === alvo ? "ring-2 ring-navy" : ""
                    }`}
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
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        <VisaoSegmentada />

        <LancamentosConta />




        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel title="Destaques e Alertas">
            <ul className="space-y-2.5 text-xs">
              <li className="flex gap-2">
                <span className="mt-1 size-2.5 shrink-0 rounded-full bg-crit" />
                <span>
                  <strong>{risco[2]!.qtd}</strong> Centros de Custo em situação crítica ({risco[2]!.valor} previstos).
                </span>
              </li>
              <li className="flex gap-2">
                <MinusCircle className="mt-px size-3.5 shrink-0 text-crit" />
                <span>
                  <strong>{risco[3]!.qtd}</strong> Itens de investimento sem execução até o momento.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 size-2.5 shrink-0 rounded-full bg-warn" />
                <span>
                  <strong>{pctFmt(saldoTop, dataset.previsto - dataset.realizado)}</strong> do saldo a executar está concentrado nos 10 maiores itens.
                </span>
              </li>
              <li className="flex gap-2">
                <Info className="mt-px size-3.5 shrink-0 text-brand" />
                <span>Ritmo médio necessário ({MESES[mb] ?? "—"}-{MESES[11]}): {mi(necessario)}/mês.</span>
              </li>
            </ul>
          </Panel>

          <Panel title={`Receita x Despesa – ${ANO()}`}>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 text-left font-medium"></th>
                  <th className="py-2 text-right font-medium">Previsto</th>
                  <th className="py-2 text-right font-medium">Realizado</th>
                  <th className="py-2 text-right font-medium">% Exec.</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { linha: "Receita", p: receita.previsto, r: receita.realizado },
                  { linha: "Despesa", p: dataset.previsto, r: dataset.realizado },
                  {
                    linha: "Resultado",
                    p: receita.previsto - dataset.previsto,
                    r: receita.realizado - dataset.realizado,
                  },
                ].map((c) => (
                  <tr key={c.linha} className="border-b border-border/60">
                    <td className="py-2">{c.linha}</td>
                    <td className="py-2 text-right tabular-nums">{mi(c.p)}</td>
                    <td className="py-2 text-right tabular-nums">{mi(c.r)}</td>
                    <td className="py-2 text-right tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        {pctFmt(c.r, c.p)}
                        {c.r >= 0 ? (
                          <ArrowUp className="size-3.5 text-ok" />
                        ) : (
                          <MinusCircle className="size-3.5 text-crit" />
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
                  <p className="text-muted-foreground">{fonte === "db" ? "PostgreSQL – dash_sesi" : "SHIFT – Gestão Corporativa"}</p>
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
                  <p className="text-muted-foreground">Até {MESES[mb - 1]}/{ANO()}</p>
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
