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


/**
 * Normaliza códigos vindos do Excel.
 *
 * - mantém códigos textuais intactos;
 * - transforma números seguros em texto integral;
 * - expande notação científica textual;
 * - bloqueia códigos numéricos com 16+ dígitos, pois o Excel pode
 *   já ter perdido precisão antes da importação.
 */
export function normalizarCodigo(
  v: string | number | null | undefined,
): string {
  if (v === null || v === undefined) return "";

  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "";

    if (!Number.isInteger(v)) {
      throw new Error(`Código numérico inválido (possui casas decimais): ${v}`);
    }

    // Excel mantém somente cerca de 15 dígitos significativos.
    // Códigos maiores devem obrigatoriamente vir armazenados como texto.
    if (Math.abs(v) >= 1_000_000_000_000_000) {
      throw new Error(
        `Código numérico com 16 ou mais dígitos (${v}). ` +
          `O Excel pode ter perdido precisão. Formate essa coluna como Texto na origem.`,
      );
    }

    return String(v);
  }

  const original = String(v).trim();
  if (!original) return "";

  // Se não estiver em notação científica, mantém exatamente o texto,
  // inclusive eventuais zeros à esquerda.
  const cientifica = /^([+-]?)(\d+)(?:[.,](\d+))?[eE]([+-]?\d+)$/.exec(original);

  if (!cientifica) return original;

  const sinal = cientifica[1] === "-" ? "-" : "";
  const parteInteira = cientifica[2]!;
  const parteDecimal = cientifica[3] ?? "";
  const expoente = Number(cientifica[4]);

  if (!Number.isInteger(expoente) || Math.abs(expoente) > 1000) {
    throw new Error(`Código em notação científica inválida: ${original}`);
  }

  const digitos = parteInteira + parteDecimal;
  const posicaoDecimal = parteInteira.length + expoente;

  let expandido: string;

  if (posicaoDecimal <= 0) {
    expandido = "0." + "0".repeat(-posicaoDecimal) + digitos;
  } else if (posicaoDecimal >= digitos.length) {
    expandido = digitos + "0".repeat(posicaoDecimal - digitos.length);
  } else {
    expandido =
      digitos.slice(0, posicaoDecimal) +
      "." +
      digitos.slice(posicaoDecimal);
  }

  // Código deve representar um inteiro.
  if (expandido.includes(".")) {
    const [inteiro, decimal = ""] = expandido.split(".");
    if (!/^0*$/.test(decimal)) {
      throw new Error(
        `Código em notação científica não representa um inteiro: ${original}`,
      );
    }
    expandido = inteiro!;
  }

  return sinal + expandido;
}

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

/**
 * Conversão ESTRITA usada na importação oficial.
 * Devolve null quando o conteúdo não é inequivocamente numérico ("ABC", "12X34").
 * Campo vazio devolve 0 apenas quando `vazioComoZero` for true.
 */
export function parseNumeroEstrito(
  v: string | number | null | undefined,
  vazioComoZero = true,
): number | null {
  if (typeof v === "number") return isFinite(v) ? v : null;
  const bruto = String(v ?? "").trim();
  if (bruto === "") return vazioComoZero ? 0 : null;

  let s = bruto.replace(/[R$\s\u00a0]/g, "");
  const neg = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()]/g, "").replace(/^[-+]/, "");
  // Só dígitos, pontos e vírgulas são aceitos.
  if (!/^[0-9]+([.,][0-9]+)*$/.test(s)) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma) s = s.replace(/,/g, "");
  else s = s.replace(/[.,]/g, "");
  const n = Number(s);
  if (!isFinite(n)) return null;
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
  // Busca alias a alias (do mais específico para o mais genérico) para evitar
  // que "conta" case com "nomeItemContabil" ("nome-item-CONTAbil").
  const buscar = (aliases: string[], filtro: (h: string) => boolean) => {
    for (const a of aliases) {
      const i = nh.findIndex((h) => filtro(h) && h.includes(a));
      if (i >= 0) return i;
    }
    return -1;
  };
  (Object.keys(ALIASES) as CampoPlanilha[]).forEach((key) => {
    const aliases = ALIASES[key];
    let idx = nh.findIndex((h) => aliases.includes(h));
    // prefere colunas de nome (nomeContaContabil) em vez de códigos (codContaContabil)
    if (idx < 0) idx = buscar(aliases, (h) => h.startsWith("nome"));
    if (idx < 0) idx = buscar(aliases, (h) => !h.startsWith("cod"));
    if (idx < 0) idx = buscar(aliases, () => true);
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
  origem: "DESPESA" | "RECEITA";
  codEmpresa: string;
  ano: number;
  mes: number;
  codCentroCusto: string;
  centroCusto: string;
  codItem: string;
  item: string;
  codConta: string;
  conta: string;
  previsto: number;
  realizado: number;
};

export type Rejeitada = { linha: number; motivo: string };

export type ResultadoNormalizacao = {
  linhas: LinhaNormalizada[];
  rejeitadas: Rejeitada[];
  total: number;
  colunasReconhecidas: CampoPlanilha[];
};

/** Origem só é aceita quando vier explícita na planilha (RECEITA ou DESPESA). */
export function parseOrigem(v: string): "DESPESA" | "RECEITA" | null {
  const s = norm(v);
  if (!s) return null;
  if (s.startsWith("rec")) return "RECEITA";
  if (s.startsWith("desp")) return "DESPESA";
  return null;
}

/**
 * Converte a matriz (cabeçalho + linhas) em lançamentos prontos para o banco.
 * Não inventa dados: origem, mês, ano e centro de custo precisam existir na
 * planilha — nada é assumido por padrão.
 */
export function normalizarMatriz(
  matriz: (string | number | null | undefined)[][],
  opts: { anoPadrao: number },
): ResultadoNormalizacao {
  const [cabecalho, ...corpo] = matriz;
  if (!cabecalho) throw new Error("Planilha sem cabeçalho.");
  const map = mapColumns(cabecalho.map((c) => String(c ?? "")));

  const faltando: string[] = [];
  if (map.origem === undefined) faltando.push("Origem (RECEITA/DESPESA)");
  if (map.previsto === undefined && map.realizado === undefined)
    faltando.push("Previsto e/ou Realizado");
  if (map.centroCusto === undefined && map.codCentroCusto === undefined)
    faltando.push("Centro de Custo");
  if (faltando.length) {
    throw new Error(
      `Colunas obrigatórias ausentes: ${faltando.join("; ")}. Colunas lidas: ${cabecalho.join(", ")}.`,
    );
  }

  const get = (c: (string | number | null | undefined)[], i?: number) =>
    i === undefined ? "" : String(c[i] ?? "").trim();

  const linhas: LinhaNormalizada[] = [];
  const rejeitadas: Rejeitada[] = [];

  corpo.forEach((c, i) => {
    const numeroLinha = i + 2; // 1 = cabeçalho
    if (c.every((v) => String(v ?? "").trim() === "")) return;

    const origem = parseOrigem(get(c, map.origem));
    if (!origem) {
      rejeitadas.push({ linha: numeroLinha, motivo: "Origem ausente ou fora de RECEITA/DESPESA" });
      return;
    }

    const codCentroCusto = normalizarCodigo(get(c, map.codCentroCusto));
    const centroCusto = get(c, map.centroCusto) || codCentroCusto;
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

    // Validação numérica rigorosa: texto inválido é erro, nunca vira 0.
    const brutoPrevisto = get(c, map.previsto);
    const brutoRealizado = get(c, map.realizado);
    const previsto = parseNumeroEstrito(brutoPrevisto);
    if (previsto === null) {
      rejeitadas.push({
        linha: numeroLinha,
        motivo: `coluna previsto — valor inválido: "${brutoPrevisto}"`,
      });
      return;
    }
    const realizado = parseNumeroEstrito(brutoRealizado);
    if (realizado === null) {
      rejeitadas.push({
        linha: numeroLinha,
        motivo: `coluna realizado — valor inválido: "${brutoRealizado}"`,
      });
      return;
    }

    const codItem = normalizarCodigo(get(c, map.codItem));
    const codConta = normalizarCodigo(get(c, map.codConta));

    linhas.push({
      origem,
      codEmpresa: normalizarCodigo(get(c, map.codEmpresa)) || "02MT",
      ano,
      mes,
      codCentroCusto,
      centroCusto,
      codItem,
      item: get(c, map.item) || codItem || "Não informado",
      codConta,
      conta: get(c, map.conta) || codConta || "Não informado",
      previsto,
      realizado,
    });
  });

  return {
    linhas,
    rejeitadas,
    total: corpo.filter((c) => c.some((v) => String(v ?? "").trim() !== "")).length,
    colunasReconhecidas: Object.keys(map) as CampoPlanilha[],
  };
}

