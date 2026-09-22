/**
 * Mapeamento EXPLÍCITO das colunas da consulta pública do Metabase para os
 * lançamentos normalizados do painel. Nada aqui usa os apelidos genéricos de
 * planilha (import-normalize) — a fonte oficial tem nomes próprios e fixos.
 *
 * Conversões oficiais:
 *   CodEmpresa      -> codEmpresa
 *   Ano             -> ano
 *   Mes             -> mes
 *   Conta_Nivel1    -> origem (DESPESAS => DESPESA, RECEITAS => RECEITA)
 *   CodCentroCusto  -> codCentroCusto
 *   CentroCusto     -> centroCusto
 *   CodItem_Nivel5 + 2 últimos dígitos de CodItem -> codItem
 *   ItemContabil    -> item
 *   CodConta        -> codConta
 *   Conta           -> conta
 *   SaldoOR         -> previsto
 *   SaldoRC         -> realizado
 *
 * A consulta de origem já exclui propositalmente as contas 310101; o app
 * importa exatamente o escopo devolvido pelo endpoint, sem filtros extras.
 */
import type { LinhaMetabase } from "@/lib/metabase";
import {
  normalizarCodigo,
  parseMes,
  parseNumeroEstrito,
  type LinhaNormalizada,
  type Rejeitada,
} from "@/lib/import-normalize";

export const COLUNAS_METABASE = [
  "CodEmpresa",
  "Ano",
  "Mes",
  "Conta_Nivel1",
  "CodCentroCusto",
  "CentroCusto",
  "CodItem_Nivel4",
  "CodItem_Nivel5",
  "CodItem",
  "ItemContabil",
  "CodConta",
  "Conta",
  "SaldoOR",
  "SaldoRC",
] as const;

export type ColunaMetabase = (typeof COLUNAS_METABASE)[number];

export type ResultadoMetabase = {
  linhas: LinhaNormalizada[];
  rejeitadas: Rejeitada[];
  total: number;
  anos: number[];
};

/** Chave comparável: minúscula, sem acentos e sem separadores. */
const chave = (s: string) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Localiza as colunas obrigatórias na resposta; falha antes de importar. */
export function mapearColunasMetabase(rows: LinhaMetabase[]): Record<ColunaMetabase, string> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("O link do Metabase não retornou nenhuma linha de dados.");
  }
  const presentes = new Map<string, string>();
  for (const r of rows.slice(0, 50)) {
    for (const k of Object.keys(r ?? {})) {
      const c = chave(k);
      if (!presentes.has(c)) presentes.set(c, k);
    }
  }
  const mapa = {} as Record<ColunaMetabase, string>;
  const faltando: string[] = [];
  for (const col of COLUNAS_METABASE) {
    const achado = presentes.get(chave(col));
    if (achado) mapa[col] = achado;
    else faltando.push(col);
  }
  if (faltando.length) {
    throw new Error(
      `A consulta do Metabase não devolveu as colunas obrigatórias: ${faltando.join(", ")}. ` +
        `Colunas recebidas: ${[...presentes.values()].join(", ")}.`,
    );
  }
  return mapa;
}

/** DESPESAS/RECEITAS -> origem oficial. Qualquer outro valor é rejeitado. */
export function origemDeContaNivel1(valor: unknown): "DESPESA" | "RECEITA" | null {
  const v = chave(String(valor ?? ""));
  if (v === "despesas" || v === "despesa") return "DESPESA";
  if (v === "receitas" || v === "receita") return "RECEITA";
  return null;
}

/**
 * codItemContabil = nível 5 + os 2 últimos dígitos de CodItem.
 * Ex.: 26306100101 + 30610010103 -> 2630610010103.
 *
 * Quando CodItem_Nivel5 vier vazio, o nível 5 é derivado de forma determinística:
 * nivel5 = CodItem_Nivel4 + CodItem.slice(-4, -2) — ou seja, o código final
 * equivale a CodItem_Nivel4 + os últimos 4 dígitos de CodItem.
 * Ex.: 253041201 + 30412010201 -> 2530412010201 (não confundir com o ramo 263).
 *
 * Devolve null quando não for possível derivar com segurança.
 */
export function derivarCodItem(
  nivel5: unknown,
  codItem: unknown,
  nivel4?: unknown,
): string | null {
  const filho = normalizarCodigo(codItem as string | number).trim();
  if (!/^\d{4,}$/.test(filho)) return null;

  let base = normalizarCodigo(nivel5 as string | number).trim();
  if (!base) {
    const b4 = normalizarCodigo(nivel4 as string | number).trim();
    if (!/^\d+$/.test(b4)) return null;
    base = b4 + filho.slice(-4, -2);
  }
  if (!/^\d+$/.test(base)) return null;
  return base + filho.slice(-2);
}


/** Converte a resposta do Metabase em lançamentos prontos para o banco. */
export function metabaseParaLinhas(rows: LinhaMetabase[]): ResultadoMetabase {
  const col = mapearColunasMetabase(rows);
  const validas: Valida[] = [];
  const rejeitadas: Rejeitada[] = [];
  const anos = new Set<number>();

  const txt = (r: LinhaMetabase, c: ColunaMetabase) => String(r?.[col[c]] ?? "").trim();

  rows.forEach((r, i) => {
    const numero = i + 1;

    const origem = origemDeContaNivel1(r?.[col.Conta_Nivel1]);
    if (!origem) {
      rejeitadas.push({
        linha: numero,
        motivo: `Conta_Nivel1 fora de DESPESAS/RECEITAS: "${txt(r, "Conta_Nivel1")}"`,
      });
      return;
    }

    const anoBruto = txt(r, "Ano");
    const ano = parseInt(anoBruto.replace(/\D/g, "").slice(0, 4), 10);
    if (!ano || ano < 2000 || ano > 2100) {
      rejeitadas.push({ linha: numero, motivo: `Ano inválido: "${anoBruto}"` });
      return;
    }

    const mes = parseMes(r?.[col.Mes] as string | number);
    if (!mes) {
      rejeitadas.push({ linha: numero, motivo: `Mes inválido: "${txt(r, "Mes")}"` });
      return;
    }

    let codCentroCusto: string;
    let codConta: string;
    try {
      codCentroCusto = normalizarCodigo(r?.[col.CodCentroCusto] as string | number).trim();
      codConta = normalizarCodigo(r?.[col.CodConta] as string | number).trim();
    } catch (e) {
      rejeitadas.push({
        linha: numero,
        motivo: e instanceof Error ? e.message : "Código inválido.",
      });
      return;
    }

    const centroCusto = txt(r, "CentroCusto") || codCentroCusto;
    if (!centroCusto) {
      rejeitadas.push({ linha: numero, motivo: "CentroCusto ausente" });
      return;
    }

    const codItem = derivarCodItem(
      r?.[col.CodItem_Nivel5],
      r?.[col.CodItem],
      r?.[col.CodItem_Nivel4],
    );
    if (!codItem) {
      rejeitadas.push({
        linha: numero,
        motivo:
          `Não foi possível derivar o código do item contábil ` +
          `(CodItem_Nivel5="${txt(r, "CodItem_Nivel5")}", CodItem_Nivel4="${txt(r, "CodItem_Nivel4")}", ` +
          `CodItem="${txt(r, "CodItem")}")`,
      });
      return;
    }

    const previsto = parseNumeroEstrito(r?.[col.SaldoOR] as string | number);
    if (previsto === null) {
      rejeitadas.push({ linha: numero, motivo: `SaldoOR inválido: "${txt(r, "SaldoOR")}"` });
      return;
    }
    const realizado = parseNumeroEstrito(r?.[col.SaldoRC] as string | number);
    if (realizado === null) {
      rejeitadas.push({ linha: numero, motivo: `SaldoRC inválido: "${txt(r, "SaldoRC")}"` });
      return;
    }

    let codEmpresa: string;
    try {
      codEmpresa = normalizarCodigo(r?.[col.CodEmpresa] as string | number).trim();
    } catch {
      codEmpresa = "";
    }

    anos.add(ano);
    validas.push({
      linha: numero,
      dados: {
        origem,
        codEmpresa: codEmpresa || "02MT",
        ano,
        mes,
        codCentroCusto,
        centroCusto,
        codItem,
        item: txt(r, "ItemContabil") || codItem,
        codConta,
        conta: txt(r, "Conta") || codConta || "Não informado",
        previsto,
        realizado,
      },
      nomes: {
        centroCusto: txt(r, "CentroCusto"),
        item: txt(r, "ItemContabil"),
        conta: txt(r, "Conta"),
      },
    });
  });

  const { linhas, conflitos } = consolidarPorChaveOficial(validas);
  rejeitadas.push(...conflitos);

  return { linhas, rejeitadas, total: rows.length, anos: [...anos].sort() };
}

type Valida = {
  linha: number;
  dados: LinhaNormalizada;
  nomes: { centroCusto: string; item: string; conta: string };
};

/** Chave oficial do grão do painel (o banco não guarda função-programa). */
export function chaveOficial(l: LinhaNormalizada): string {
  return [l.origem, l.codEmpresa, l.ano, l.mes, l.codCentroCusto, l.codItem, l.codConta].join("|");
}

const iguais = (a: string, b: string) => chave(a) === chave(b);

/**
 * Consolida desdobramentos (ex.: por função-programa) que compartilham a chave
 * oficial, somando previsto/realizado. Nomes divergentes na mesma chave não são
 * silenciados: viram conflito e impedem a importação.
 */
function consolidarPorChaveOficial(validas: Valida[]): {
  linhas: LinhaNormalizada[];
  conflitos: Rejeitada[];
} {
  const mapa = new Map<string, { linha: number; dados: LinhaNormalizada; nomes: Valida["nomes"] }>();
  const conflitos: Rejeitada[] = [];

  for (const v of validas) {
    const k = chaveOficial(v.dados);
    const atual = mapa.get(k);
    if (!atual) {
      mapa.set(k, { linha: v.linha, dados: { ...v.dados }, nomes: { ...v.nomes } });
      continue;
    }

    const campos: Array<keyof Valida["nomes"]> = ["centroCusto", "item", "conta"];
    let conflito = false;
    for (const campo of campos) {
      const a = atual.nomes[campo];
      const b = v.nomes[campo];
      if (a && b && !iguais(a, b)) {
        conflitos.push({
          linha: v.linha,
          motivo:
            `Conflito de descrição em "${campo}" para a mesma chave oficial ` +
            `(linha ${atual.linha}: "${a}" x linha ${v.linha}: "${b}").`,
        });
        conflito = true;
      } else if (!a && b) {
        atual.nomes[campo] = b;
        atual.dados[campo] = v.dados[campo];
      }
    }
    if (conflito) continue;

    atual.dados.previsto += v.dados.previsto;
    atual.dados.realizado += v.dados.realizado;
  }

  return { linhas: [...mapa.values()].map((v) => v.dados), conflitos };
}

