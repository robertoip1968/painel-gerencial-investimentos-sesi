import type { SegRow } from "@/lib/dashboard-data";
import {
  csvParaMatriz,
  mapColumns,
  parseNumber,
  type CampoPlanilha,
} from "@/lib/import-normalize";

export { parseNumber };

export type RawRow = {
  centroCusto: string;
  item: string;
  conta: string;
  grupoCC: string;
  mes: string;
  previsto: number;
  realizado: number;
};

export type Dataset = {
  fileName: string;
  linhas: number;
  segCentroCusto: SegRow[];
  segItem: SegRow[];
  segConta: SegRow[];
  previsto: number;
  realizado: number;
  mensal?: { mes: number; previsto: number; realizado: number }[];
};

function agrupar(rows: RawRow[], key: (r: RawRow) => string, grupo: (r: RawRow) => string): SegRow[] {
  const m = new Map<string, SegRow>();
  for (const r of rows) {
    const nome = key(r) || "Não informado";
    const cur = m.get(nome) ?? { nome, grupo: grupo(r) || "—", previsto: 0, realizado: 0 };
    cur.previsto += r.previsto;
    cur.realizado += r.realizado;
    m.set(nome, cur);
  }
  return [...m.values()].sort((a, b) => b.previsto - a.previsto);
}


/** Leitura rápida de CSV para pré-visualização em DEV (não persiste nada). */
export function parseDashboardCsv(text: string, fileName: string): Dataset {
  const matriz = csvParaMatriz(text);
  const headers = matriz[0] ?? [];
  const map: Partial<Record<CampoPlanilha, number>> = mapColumns(headers);

  if (map.previsto === undefined && map.realizado === undefined) {
    throw new Error(
      `Não encontrei colunas de valores. Colunas lidas: ${headers.join(", ")}. Esperado algo como "Previsto", "Comprometido", "Realizado".`,
    );
  }

  const get = (cols: string[], i?: number) => (i === undefined ? "" : (cols[i] ?? ""));
  const rows: RawRow[] = matriz.slice(1).map((c) => ({
    centroCusto: get(c, map.centroCusto),
    item: get(c, map.item),
    conta: get(c, map.conta),
    grupoCC: get(c, map.grupoCC),
    mes: get(c, map.mes),
    previsto: parseNumber(get(c, map.previsto)),
    comprometido: parseNumber(get(c, map.comprometido)),
    realizado: parseNumber(get(c, map.realizado)),
  }));

  const totals = rows.reduce(
    (a, r) => ({
      previsto: a.previsto + r.previsto,
      comprometido: a.comprometido + r.comprometido,
      realizado: a.realizado + r.realizado,
    }),
    { previsto: 0, comprometido: 0, realizado: 0 },
  );

  const mensal = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, previsto: 0, realizado: 0 }));
  let temMes = false;
  for (const r of rows) {
    const m = parseInt(r.mes, 10);
    if (m >= 1 && m <= 12) {
      temMes = true;
      mensal[m - 1]!.previsto += r.previsto;
      mensal[m - 1]!.realizado += r.realizado;
    }
  }

  return {
    fileName,
    linhas: rows.length,
    segCentroCusto: agrupar(rows, (r) => r.centroCusto, (r) => r.grupoCC),
    segItem: agrupar(rows, (r) => r.item || r.centroCusto, (r) => r.conta),
    segConta: agrupar(rows, (r) => r.conta, (r) => r.item || "Conta contábil"),
    ...(temMes ? { mensal } : {}),
    ...totals,
  };
}
