/**
 * Regras únicas de leitura de planilhas do painel (CSV e Excel).
 * Toda a inteligência de aliases de coluna, normalização de texto e
 * conversão de números no formato brasileiro vive AQUI — não duplicar.
 */

export type CampoPlanilha =
  | "ano"
  | "mes"
  | "origem"
  | "codEmpresa"
  | "codCentroCusto"
  | "centroCusto"
  | "codItem"
  | "item"
  | "codConta"
  | "conta"
  | "grupoCC"
  | "previsto"
  | "realizado";

export const ALIASES: Record<CampoPlanilha, string[]> = {
  ano: ["ano", "exercicio", "exercício", "ano exercicio", "competencia ano"],
  mes: ["mes", "mês", "competencia", "competência", "periodo", "período"],
  // "origem" é o nome oficial da planilha SHIFT (RECEITA / DESPESA)
  origem: ["origem", "tipo", "natureza lancamento", "tipo lancamento", "tipo de lancamento"],
  codEmpresa: ["cod_empresa", "cod empresa", "codempresa", "empresa", "entidade", "regional"],
  codCentroCusto: ["cod_centro_custo", "cod centro custo", "codcentrocusto", "cod cc"],
  centroCusto: [
    "nome_centro_custo",
    "nome centro custo",
    "centro de custo",
    "centrocusto",
    "centro_custo",
    "cc",
    "unidade",
    "centro",
  ],
  codItem: ["cod_item_contabil", "cod item contabil", "coditemcontabil", "cod item"],
  item: [
    "nome_item_contabil",
    "nome item contabil",
    "item",
    "item de investimento",
    "iteminvestimento",
    "item_investimento",
    "item contabil",
    "item contábil",
    "descricao",
    "descrição",
    "projeto",
    "investimento",
  ],
  codConta: ["cod_conta_contabil", "cod conta contabil", "codcontacontabil", "cod conta"],
  conta: [
    "nome_conta_contabil",
    "nome conta contabil",
    "conta contabil",
    "conta contábil",
    "conta_contabil",
    "contacontabil",
    "conta",
    "natureza",
  ],
  grupoCC: ["grupo", "area", "área", "gerencia", "gerência", "segmento"],
  previsto: ["previsto", "orcado", "orçado", "orcamento", "orçamento", "valor previsto", "budget"],
  realizado: ["realizado", "executado", "pago", "valor realizado", "despesa"],
};


export const norm = (s: string) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/["']/g, "");

/** Converte "1.234.567,89", "R$ 1.234,56", "(1.234,56)" etc. para número. */
export function parseNumber(v: string | number | null | undefined): number {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (!v) return 0;
  let s = String(v).replace(/[R$\s\u00a0%]/g, "");
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

const MESES_NOME = [
  "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez",
];

/** Aceita 1..12, "03", "mar", "março", "03/2026", "2026-03-01". */
export function parseMes(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && v >= 1 && v <= 12) return Math.trunc(v);
  const s = norm(String(v));
  const iso = /^(\d{4})-(\d{2})/.exec(s);
  if (iso) return parseInt(iso[2]!, 10);
  const br = /^(\d{1,2})[/-](\d{4})$/.exec(s);
  if (br) return parseInt(br[1]!, 10);
  const somenteNum = /^\d{1,2}$/.exec(s);
  if (somenteNum) {
    const n = parseInt(s, 10);
    return n >= 1 && n <= 12 ? n : null;
  }
  const idx = MESES_NOME.findIndex((m) => s.startsWith(m));
  return idx >= 0 ? idx + 1 : null;
}

/** Mapeia índices das colunas do cabeçalho para os campos conhecidos. */
export function mapColumns(headers: (string | number)[]) {
  const nh = headers.map((h) => norm(String(h)));
  const map: Partial<Record<CampoPlanilha, number>> = {};
  (Object.keys(ALIASES) as CampoPlanilha[]).forEach((key) => {
    let idx = nh.findIndex((h) => ALIASES[key].includes(h));
    // prefere colunas de nome (nomeCentroCusto) em vez de códigos (codCentroCusto)
    if (idx < 0)
      idx = nh.findIndex((h) => h.startsWith("nome") && ALIASES[key].some((a) => h.includes(a)));
    if (idx < 0)
      idx = nh.findIndex((h) => !h.startsWith("cod") && ALIASES[key].some((a) => h.includes(a)));
    if (idx < 0) idx = nh.findIndex((h) => ALIASES[key].some((a) => h.includes(a)));
    if (idx >= 0) map[key] = idx;
  });
  return map;
}

// ---------------- CSV -----------------

export function splitLine(line: string, delim: string) {
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

export function detectDelim(header: string) {
  const cands = [";", ",", "\t", "|"];
  return cands.reduce((best, d) =>
    header.split(d).length > header.split(best).length ? d : best,
  );
}

/** CSV -> matriz [cabeçalho, ...linhas]. */
export function csvParaMatriz(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("Arquivo vazio ou sem linhas de dados.");
  const delim = detectDelim(lines[0] ?? "");
  return lines.map((l) => splitLine(l, delim));
}

// ------------- Normalização para persistência -------------

export type LinhaNormalizada = {
  ano: number;
  mes: number;
  tipo: "DESPESA" | "RECEITA";
  empresa: string;
  centroCusto: string;
  item: string;
  conta: string;
  previsto: number;
  comprometido: number;
  realizado: number;
};

export type Rejeitada = { linha: number; motivo: string };

export type ResultadoNormalizacao = {
  linhas: LinhaNormalizada[];
  rejeitadas: Rejeitada[];
  total: number;
  colunasReconhecidas: CampoPlanilha[];
};

/**
 * Converte a matriz (cabeçalho + linhas) em lançamentos prontos para o banco.
 * Não inventa dados: linhas sem mês ou sem centro de custo são rejeitadas.
 */
export function normalizarMatriz(
  matriz: (string | number | null | undefined)[][],
  opts: { anoPadrao: number },
): ResultadoNormalizacao {
  const [cabecalho, ...corpo] = matriz;
  if (!cabecalho) throw new Error("Planilha sem cabeçalho.");
  const map = mapColumns(cabecalho.map((c) => String(c ?? "")));

  if (map.previsto === undefined && map.realizado === undefined) {
    throw new Error(
      `Não encontrei colunas de valores. Colunas lidas: ${cabecalho.join(", ")}. Esperado algo como "Previsto", "Comprometido", "Realizado".`,
    );
  }
  if (map.centroCusto === undefined) {
    throw new Error(
      `Não encontrei a coluna de Centro de Custo. Colunas lidas: ${cabecalho.join(", ")}.`,
    );
  }

  const get = (c: (string | number | null | undefined)[], i?: number) =>
    i === undefined ? "" : String(c[i] ?? "").trim();

  const linhas: LinhaNormalizada[] = [];
  const rejeitadas: Rejeitada[] = [];

  corpo.forEach((c, i) => {
    const numeroLinha = i + 2; // 1 = cabeçalho
    if (c.every((v) => String(v ?? "").trim() === "")) return;

    const centroCusto = get(c, map.centroCusto);
    if (!centroCusto) {
      rejeitadas.push({ linha: numeroLinha, motivo: "Centro de custo ausente" });
      return;
    }

    const mes = parseMes(get(c, map.mes));
    if (!mes) {
      rejeitadas.push({ linha: numeroLinha, motivo: "Mês ausente ou inválido" });
      return;
    }

    const anoBruto = get(c, map.ano);
    const ano = anoBruto ? parseInt(anoBruto.replace(/\D/g, "").slice(0, 4), 10) : opts.anoPadrao;
    if (!ano || ano < 2000 || ano > 2100) {
      rejeitadas.push({ linha: numeroLinha, motivo: "Ano inválido" });
      return;
    }

    const tipoBruto = norm(get(c, map.tipo));
    const tipo: "DESPESA" | "RECEITA" = tipoBruto.startsWith("rec") ? "RECEITA" : "DESPESA";

    linhas.push({
      ano,
      mes,
      tipo,
      empresa: get(c, map.empresa) || "02MT",
      centroCusto,
      item: get(c, map.item) || "Não informado",
      conta: get(c, map.conta) || "Não informado",
      previsto: parseNumber(get(c, map.previsto)),
      comprometido: parseNumber(get(c, map.comprometido)),
      realizado: parseNumber(get(c, map.realizado)),
    });
  });

  return {
    linhas,
    rejeitadas,
    total: corpo.filter((c) => c.some((v) => String(v ?? "").trim() !== "")).length,
    colunasReconhecidas: Object.keys(map) as CampoPlanilha[],
  };
}
