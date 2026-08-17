import type { Dataset } from "@/lib/csv-import";
import { kpis as kpisDemo } from "@/lib/dashboard-data";

const mi = (n: number) => `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`;
const pct = (n: number, base: number) =>
  `${base > 0 ? ((n / base) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}% do orçamento`;

export type Kpi = (typeof kpisDemo)[number];

/** KPIs derivados do CSV; mantém a mesma estrutura dos dados de demonstração. */
export function kpisFromDataset(d: Dataset): Kpi[] {
  const saldo = d.previsto - d.realizado;
  const disponivel = d.previsto - d.comprometido - d.realizado;
  const forecast = d.realizado * 2; // ritmo atual projetado para o exercício
  const desvio = forecast - d.previsto;
  return [
    { label: "Orçamento (Previsto)", value: mi(d.previsto), sub: "100% do total", icon: "coins" },
    { label: "Comprometido", value: mi(d.comprometido), sub: pct(d.comprometido, d.previsto), icon: "file" },
    { label: "Realizado", value: mi(d.realizado), sub: pct(d.realizado, d.previsto), icon: "check" },
    { label: "Saldo a Executar", value: mi(saldo), sub: pct(saldo, d.previsto), icon: "pie" },
    { label: "Disponível após compromissos", value: mi(disponivel), sub: pct(disponivel, d.previsto), icon: "wallet" },
    { label: "Forecast (ritmo atual)", value: mi(forecast), sub: pct(forecast, d.previsto), icon: "trend" },
    {
      label: "Desvio Forecast",
      value: `${desvio < 0 ? "- " : ""}${mi(Math.abs(desvio))}`,
      sub: pct(desvio, d.previsto),
      icon: "target",
      negative: desvio < 0,
    },
  ] as unknown as Kpi[];
}
