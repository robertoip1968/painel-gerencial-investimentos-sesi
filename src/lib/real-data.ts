import type { Dataset } from "@/lib/csv-import";
import { anoExercicio, mesFechadoConfig, mesParcial } from "@/lib/exercicio";

export const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

/** Exercício analisado (PAINEL_ANO_PADRAO, aplicado pelo backend). */
export const ANO = () => anoExercicio();
export { mesFechadoConfig, mesParcial };

export const mi = (n: number) =>
  `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`;
export const pctFmt = (n: number, base_: number) =>
  `${base_ > 0 ? ((n / base_) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}%`;

/**
 * Último mês ENCERRADO (1-12).
 * Quando PAINEL_MES_FECHADO está configurado, ele manda: o mês parcial e os
 * meses futuros nunca entram como encerrados. Sem configuração (DEV), cai na
 * detecção pelo último mês com execução registrada.
 */
export function mesBase(_d?: Dataset) {
  const cfg = mesFechadoConfig();
  if (cfg >= 1 && cfg <= 12) return cfg;
  const m = _d?.mensal ?? [];
  let last = 0;
  m.forEach((x) => {
    if (x.realizado > 0) last = x.mes;
  });
  return last || 6;
}

/** Realizado acumulado somente nos meses ENCERRADOS. */
export function realizadoFechado(d: Dataset) {
  const mb = mesBase(d);
  const m = d.mensal ?? [];
  if (!m.length) return d.realizado;
  return m.slice(0, mb).reduce((a, x) => a + x.realizado, 0);
}

/** Série acumulada em milhões, com forecast pelo ritmo médio realizado. */
export function serieAcumulada(d: Dataset) {
  const m = d.mensal ?? [];
  if (!m.length) return [] as { mes: string; previsto: number; realizado: number | null; forecast: number | null }[];
  const base_ = mesBase(d);
  const realTotal = m.slice(0, base_).reduce((a, x) => a + x.realizado, 0);
  const ritmo = realTotal / base_;
  let accP = 0;
  let accR = 0;
  let accF = 0;
  return m.map((x, i) => {
    accP += x.previsto;
    const mes = i + 1;
    let realizado: number | null = null;
    let forecast: number | null = null;
    if (mes <= base_) {
      accR += x.realizado;
      realizado = accR / 1e6;
      accF = accR;
      if (mes === base_) forecast = accF / 1e6;
    } else {
      accF += ritmo;
      forecast = accF / 1e6;
    }
    return { mes: MESES[i]!, previsto: accP / 1e6, realizado, forecast };
  });
}

export function ritmos(d: Dataset) {
  const base_ = mesBase(d);
  // Ritmo calculado SOMENTE com os meses fechados (mês parcial fica de fora).
  const media = realizadoFechado(d) / base_;
  const restantes = Math.max(1, 12 - base_);
  const necessario = (d.previsto - d.realizado) / restantes;
  return { base: base_, media, necessario, restantes };
}

export function forecastAno(d: Dataset) {
  const { media } = ritmos(d);
  return media * 12;
}

/** Top N contas contábeis por previsto + "Demais". */
export function contasPct(d: Dataset, n = 9) {
  const total = d.previsto || 1;
  const list = [...d.segConta].sort((a, b) => b.previsto - a.previsto);
  const top = list.slice(0, n).map((c) => ({ nome: c.nome, pct: (c.previsto / total) * 100, valor: c.previsto }));
  const resto = list.slice(n).reduce((a, c) => a + c.previsto, 0);
  if (resto > 0) top.push({ nome: "Demais contas", pct: (resto / total) * 100, valor: resto });
  return top;
}

export type LinhaCC = {
  cc: string;
  previsto: number;
  realizado: number;
  pct: string;
  saldo: number;
  situacao: "ok" | "warn" | "crit";
};

export function situacaoDe(pct: number, meta: number): "ok" | "warn" | "crit" {
  if (pct >= meta * 0.9) return "ok";
  if (pct >= meta * 0.6) return "warn";
  return "crit";
}

export function centrosTop(d: Dataset, n = 9): { linhas: LinhaCC[]; total: LinhaCC } {
  const meta = (mesBase(d) / 12) * 100;
  const list = [...d.segCentroCusto].sort((a, b) => b.previsto - a.previsto);
  const mk = (nome: string, previsto: number, realizado: number): LinhaCC => {
    const p = previsto > 0 ? (realizado / previsto) * 100 : 0;
    return {
      cc: nome,
      previsto,
      realizado,
      pct: `${p.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
      saldo: previsto - realizado,
      situacao: situacaoDe(p, meta),
    };
  };
  const linhas = list.slice(0, n).map((c) => mk(c.nome, c.previsto, c.realizado));
  const resto = list.slice(n).reduce((a, c) => ({ p: a.p + c.previsto, r: a.r + c.realizado }), { p: 0, r: 0 });
  if (resto.p > 0) linhas.push(mk("Demais centros de custo", resto.p, resto.r));
  return { linhas, total: mk("TOTAL", d.previsto, d.realizado) };
}

export function maioresSaldos(d: Dataset, n = 10) {
  const saldoTotal = d.previsto - d.realizado || 1;
  return [...d.segItem]
    .map((i) => ({ item: i.nome, cc: i.grupo, saldo: i.previsto - i.realizado }))
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, n)
    .map((i) => ({ ...i, pct: `${((i.saldo / saldoTotal) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` }));
}

export function riscoResumo(d: Dataset) {
  const meta = (mesBase(d) / 12) * 100;
  const buckets = { ok: { q: 0, v: 0 }, warn: { q: 0, v: 0 }, crit: { q: 0, v: 0 } };
  d.segCentroCusto.forEach((c) => {
    const p = c.previsto > 0 ? (c.realizado / c.previsto) * 100 : 0;
    const s = situacaoDe(p, meta);
    buckets[s].q += 1;
    buckets[s].v += c.previsto;
  });
  const semExec = d.segItem.filter((i) => i.previsto > 0 && i.realizado === 0);
  const semExecValor = semExec.reduce((a, i) => a + i.previsto, 0);
  return [
    {
      titulo: "Em dia",
      tone: "ok" as const,
      qtd: buckets.ok.q,
      unidade: "Centros de Custo",
      valor: mi(buckets.ok.v),
      sub: `${pctFmt(buckets.ok.v, d.previsto)} do orçamento`,
    },
    {
      titulo: "Atenção",
      tone: "warn" as const,
      qtd: buckets.warn.q,
      unidade: "Centros de Custo",
      valor: mi(buckets.warn.v),
      sub: `${pctFmt(buckets.warn.v, d.previsto)} do orçamento`,
    },
    {
      titulo: "Crítico",
      tone: "crit" as const,
      qtd: buckets.crit.q,
      unidade: "Centros de Custo",
      valor: mi(buckets.crit.v),
      sub: `${pctFmt(buckets.crit.v, d.previsto)} do orçamento`,
    },
    {
      titulo: "Sem execução",
      tone: "neutral" as const,
      qtd: semExec.length,
      unidade: "Itens contábeis",
      valor: mi(semExecValor),
      sub: `${pctFmt(semExecValor, d.previsto)} do orçamento`,
    },
  ];
}

export function respostasFrom(d: Dataset) {
  const { base: mb, media, necessario } = ritmos(d);
  const saldo = d.previsto - d.realizado;
  const fc = forecastAno(d);
  const maiorConta = [...d.segConta].sort((a, b) => b.previsto - a.previsto)[0];
  const meta = (mb / 12) * 100;
  const criticos = d.segCentroCusto.filter(
    (c) => c.previsto > 0 && (c.realizado / c.previsto) * 100 < meta * 0.6,
  );
  const criticoValor = criticos.reduce((a, c) => a + c.previsto, 0);
  const periodo = `${MESES[0]}-${MESES[mb - 1]}`;
  return [
    { pergunta: "Quanto temos previsto?", resposta: mi(d.previsto), detalhe: `Orçamento ${ANO()} • ${d.linhas.toLocaleString("pt-BR")} lançamentos`, tone: "brand" as const },
    { pergunta: "Quanto já realizamos?", resposta: mi(d.realizado), detalhe: `${pctFmt(d.realizado, d.previsto)} do previsto (${periodo})`, tone: "ok" as const },
    { pergunta: "Quanto falta executar?", resposta: mi(saldo), detalhe: `${pctFmt(saldo, d.previsto)} em ${12 - mb} meses restantes`, tone: "warn" as const },
    {
      pergunta: "Onde estão os maiores investimentos?",
      resposta: maiorConta?.nome ?? "—",
      detalhe: maiorConta ? `${pctFmt(maiorConta.previsto, d.previsto)} do orçamento • ${mi(maiorConta.previsto)}` : "",
      tone: "brand" as const,
    },
    {
      pergunta: "Onde estão os principais desvios?",
      resposta: `${criticos.length} CC críticos • ${mi(criticoValor)}`,
      detalhe: `Execução abaixo de ${(meta * 0.6).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% da meta linear`,
      tone: "crit" as const,
    },
    { pergunta: "Qual o ritmo de execução?", resposta: `${mi(media)}/mês`, detalhe: `Necessário: ${mi(necessario)}/mês`, tone: "warn" as const },
    {
      pergunta: "Qual a tendência de encerramento?",
      resposta: `${mi(fc)} (${pctFmt(fc, d.previsto)})`,
      detalhe: `Desvio projetado: ${fc - d.previsto < 0 ? "- " : "+ "}${mi(Math.abs(fc - d.previsto))}`,
      tone: fc < d.previsto ? ("crit" as const) : ("ok" as const),
    },
  ];
}
