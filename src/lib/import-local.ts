/**
 * Modo de desenvolvimento/pré-visualização: lê os dados do Metabase pelo
 * proxy /api/metabase e monta o payload de fatos em memória.
 * Nada é gravado no PostgreSQL — serve apenas para conferir os dados aqui.
 */
import type { FatosPayload } from "@/lib/facts";
import { normalizarMatriz } from "@/lib/import-normalize";
import { jsonParaMatriz, type LinhaMetabase } from "@/lib/metabase";
import { anoExercicio } from "@/lib/exercicio";

type Bloco = FatosPayload["despesa"];

const blocoVazio = (): Bloco => ({
  n: 0,
  mes: [],
  cc: [],
  item: [],
  conta: [],
  linhas: [],
  previsto: [],
  realizado: [],
});

const rotulo = (codigo: string | undefined, nome: string) =>
  codigo ? `${codigo} — ${nome}` : nome;

function indice(list: string[], mapa: Map<string, number>, valor: string) {
  const j = mapa.get(valor);
  if (j !== undefined) return j;
  const i = list.length;
  list.push(valor);
  mapa.set(valor, i);
  return i;
}

export type ResultadoLocal = {
  payload: FatosPayload;
  total: number;
  importadas: number;
  rejeitadas: { linha: number; motivo: string }[];
};

const FONTE = "Metabase (consulta pública)";

export async function importarLocalmente(): Promise<ResultadoLocal> {
  const resposta = await fetch("/api/metabase", { credentials: "same-origin" });
  const corpo = (await resposta.json().catch(() => ({}))) as {
    ok?: boolean;
    linhas?: LinhaMetabase[];
    error?: string;
  };
  if (!resposta.ok || !corpo.ok || !corpo.linhas) {
    throw new Error(corpo.error ?? "Não foi possível acessar o link do Metabase.");
  }
  const matriz = jsonParaMatriz(corpo.linhas);

  const anoPadrao = anoExercicio();
  const n = normalizarMatriz(matriz, { anoPadrao });
  if (n.rejeitadas.length > 0) {
    return { payload: vazioLocal(FONTE), total: n.total, importadas: 0, rejeitadas: n.rejeitadas };
  }

  const cc: string[] = [];
  const item: string[] = [];
  const conta: string[] = [];
  const mCC = new Map<string, number>();
  const mItem = new Map<string, number>();
  const mConta = new Map<string, number>();

  const despesa = blocoVazio();
  const receita = blocoVazio();
  const chaves = new Map<string, number>(); // agregação por grão

  let ano = anoPadrao;
  let empresa = "02MT";

  for (const l of n.linhas) {
    ano = l.ano;
    empresa = l.codEmpresa || empresa;
    const b = l.origem === "RECEITA" ? receita : despesa;
    const iCC = indice(cc, mCC, rotulo(l.codCentroCusto, l.centroCusto));
    const iItem = indice(item, mItem, rotulo(l.codItem, l.item));
    const iConta = indice(conta, mConta, rotulo(l.codConta, l.conta));
    const chave = `${l.origem}|${l.mes}|${iCC}|${iItem}|${iConta}`;
    const existente = chaves.get(chave);
    if (existente !== undefined) {
      b.linhas[existente] = b.linhas[existente]! + 1;
      b.previsto[existente] = b.previsto[existente]! + l.previsto;
      b.realizado[existente] = b.realizado[existente]! + l.realizado;
      continue;
    }
    const i = b.n;
    chaves.set(chave, i);
    b.mes.push(l.mes);
    b.cc.push(iCC);
    b.item.push(iItem);
    b.conta.push(iConta);
    b.linhas.push(1);
    b.previsto.push(l.previsto);
    b.realizado.push(l.realizado);
    b.n = i + 1;
  }

  return {
    payload: {
      ano,
      empresa,
      fileName: `${FONTE} — leitura local (sem banco)`,
      cc,
      item,
      conta,
      despesa,
      receita,
    },
    total: n.total,
    importadas: n.linhas.length,
    rejeitadas: [],
  };
}

function vazioLocal(fileName: string): FatosPayload {
  return {
    ano: anoExercicio(),
    empresa: "02MT",
    fileName,
    cc: [],
    item: [],
    conta: [],
    despesa: blocoVazio(),
    receita: blocoVazio(),
  };
}
