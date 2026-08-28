import type { Dataset } from "@/lib/csv-import";
import { forecastAno, mi, pctFmt } from "@/lib/real-data";

export type Kpi = {
  label: string;
  value: string;
  sub: string;
  icon: "coins" | "check" | "pie" | "trend" | "target";
  negative?: boolean;
};

/** KPIs derivados dos dados carregados (a base oficial SHIFT não traz "comprometido"). */
export function kpisFromDataset(d: Dataset): Kpi[] {
  const saldo = d.previsto - d.realizado;
  const forecast = forecastAno(d);
  const desvio = forecast - d.previsto;
return [
    { label: "Orçamento (Previsto)", value: mi(d.previsto), sub: "100% do total", icon: "coins" },
    { label: "Realizado", value: mi(d.realizado), sub: `${pctFmt(d.realizado, d.previsto)} do orçamento`, icon: "check" },
    { label: "Saldo a Executar", value: mi(saldo), sub: `${pctFmt(saldo, d.previsto)} do orçamento`, icon: "pie" },
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

