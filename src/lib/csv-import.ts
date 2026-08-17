import type { SegRow } from "@/lib/dashboard-data";

export type RawRow = {
  centroCusto: string;
  item: string;
  conta: string;
  grupoCC: string;
  previsto: number;
  comprometido: number;
  realizado: number;
};

export type Dataset = {
  fileName: string;
  linhas: number;
  segCentroCusto: SegRow[];
  segItem: SegRow[];
  segConta: SegRow[];
  previsto: number;
  comprometido: number;
  realizado: number;
};

const ALIASES: Record<keyof RawRow, string[]> = {
  centroCusto: ["centro de custo", "centrocusto", "centro_custo", "cc", "unidade", "centro"],
  item: ["item", "item de investimento", "iteminvestimento", "item_investimento", "descricao", "descrição", "projeto", "investimento"],
  conta: ["conta contabil", "conta contábil", "conta_contabil", "contacontabil", "conta", "natureza"],
  grupoCC: ["grupo", "area", "área", "gerencia", "gerência", "segmento"],
  previsto: ["previsto", "orcado", "orçado", "orcamento", "orçamento", "valor previsto", "budget"],
  comprometido: ["comprometido", "empenhado", "compromissado", "valor comprometido"],
  realizado: ["realizado", "executado", "pago", "valor realizado", "despesa"],
};

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/["']/g, "");

function splitLine(line: string, delim: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === delim && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim().replace(/^"|"$/g, ""));
}

function detectDelim(header: string) {
  const cands = [";", ",", "\t", "|"];
  return cands.reduce((best, d) =>
    header.split(d).length > header.split(best).length ? d : best,
  );
}

export function parseNumber(v: string): number {
  if (!v) return 0;
  let s = v.replace(/[R$\s\u00a0%]/g, "");
  const neg = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()]/g, "").replace(/^-/, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma) s = s.replace(/,/g, "");
  else s = s.replace(/[.,]/g, "");
  const n = parseFloat(s);
  if (!isFinite(n)) return 0;
  return neg ? -n : n;
}

function mapColumns(headers: string[]) {
  const nh = headers.map(norm);
  const map: Partial<Record<keyof RawRow, number>> = {};
  (Object.keys(ALIASES) as (keyof RawRow)[]).forEach((key) => {
    let idx = nh.findIndex((h) => ALIASES[key].includes(h));
    if (idx < 0) idx = nh.findIndex((h) => ALIASES[key].some((a) => h.includes(a)));
    if (idx >= 0) map[key] = idx;
  });
  return map;
}

function agrupar(rows: RawRow[], key: (r: RawRow) => string, grupo: (r: RawRow) => string): SegRow[] {
  const m = new Map<string, SegRow>();
  for (const r of rows) {
    const nome = key(r) || "Não informado";
    const cur = m.get(nome) ?? { nome, grupo: grupo(r) || "—", previsto: 0, comprometido: 0, realizado: 0 };
    cur.previsto += r.previsto;
    cur.comprometido += r.comprometido;
    cur.realizado += r.realizado;
    m.set(nome, cur);
  }
  return [...m.values()].sort((a, b) => b.previsto - a.previsto);
}

export function parseDashboardCsv(text: string, fileName: string): Dataset {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("Arquivo vazio ou sem linhas de dados.");
  const headerLine = lines[0] ?? "";
  const delim = detectDelim(headerLine);
  const headers = splitLine(headerLine, delim);
  const map = mapColumns(headers);

  if (map.previsto === undefined && map.realizado === undefined) {
    throw new Error(
      `Não encontrei colunas de valores. Colunas lidas: ${headers.join(", ")}. Esperado algo como "Previsto", "Comprometido", "Realizado".`,
    );
  }

  const get = (cols: string[], i?: number) => (i === undefined ? "" : (cols[i] ?? ""));
  const rows: RawRow[] = lines.slice(1).map((l) => {
    const c = splitLine(l, delim);
    return {
      centroCusto: get(c, map.centroCusto),
      item: get(c, map.item),
      conta: get(c, map.conta),
      grupoCC: get(c, map.grupoCC),
      previsto: parseNumber(get(c, map.previsto)),
      comprometido: parseNumber(get(c, map.comprometido)),
      realizado: parseNumber(get(c, map.realizado)),
    };
  });

  const totals = rows.reduce(
    (a, r) => ({
      previsto: a.previsto + r.previsto,
      comprometido: a.comprometido + r.comprometido,
      realizado: a.realizado + r.realizado,
    }),
    { previsto: 0, comprometido: 0, realizado: 0 },
  );

  return {
    fileName,
    linhas: rows.length,
    segCentroCusto: agrupar(rows, (r) => r.centroCusto, (r) => r.grupoCC),
    segItem: agrupar(rows, (r) => r.item || r.centroCusto, (r) => r.conta),
    segConta: agrupar(rows, (r) => r.conta, () => "Imobilizado"),
    ...totals,
  };
}
