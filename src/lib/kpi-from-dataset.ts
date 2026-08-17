import type { Dataset } from "@/lib/csv-import";
import { forecastAno, mi, pctFmt } from "@/lib/real-data";

export type Kpi = {
  label: string;
  value: string;
  sub: string;
  icon: "coins" | "file" | "check" | "pie" | "wallet" | "trend" | "target";
  negative?: boolean;
};

/** KPIs derivados dos dados carregados. */
export function kpisFromDataset(d: Dataset): Kpi[] {
  const saldo = d.previsto - d.realizado;
  const disponivel = d.previsto - d.comprometido - d.realizado;
  const forecast = forecastAno(d);
  const desvio = forecast - d.previsto;
  return [
    { label: "Orçamento (Previsto)", value: mi(d.previsto), sub: "100% do total", icon: "coins" },
    {
      label: "Comprometido",
      value: mi(d.comprometido),
      sub: d.comprometido > 0 ? `${pctFmt(d.comprometido, d.previsto)} do orçamento` : "não informado na base",
      icon: "file",
    },
    { label: "Realizado", value: mi(d.realizado), sub: `${pctFmt(d.realizado, d.previsto)} do orçamento`, icon: "check" },
    { label: "Saldo a Executar", value: mi(saldo), sub: `${pctFmt(saldo, d.previsto)} do orçamento`, icon: "pie" },
    {
      label: "Disponível após compromissos",
      value: mi(disponivel),
      sub: `${pctFmt(disponivel, d.previsto)} do orçamento`,
      icon: "wallet",
    },
    { label: "Forecast (ritmo atual)", value: mi(forecast), sub: `${pctFmt(forecast, d.previsto)} do orçamento`, icon: "trend" },
    {
      label: "Desvio Forecast",
      value: `${desvio < 0 ? "- " : ""}${mi(Math.abs(desvio))}`,
      sub: `${pctFmt(desvio, d.previsto)} do orçamento`,
      icon: "target",
      negative: desvio < 0,
    },
  ];
}
