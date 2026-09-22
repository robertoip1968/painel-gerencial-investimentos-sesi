/**
 * Modo de desenvolvimento/pré-visualização: monta o payload de fatos em memória.
 * Fonte oficial: consulta do Metabase via proxy /api/metabase.
 * Contingência: planilha .xlsx lida no próprio navegador.
 * Nada é gravado no PostgreSQL — serve apenas para conferir os dados aqui.
 */
import type { FatosPayload } from "@/lib/facts";
import { normalizarMatriz, type LinhaNormalizada } from "@/lib/import-normalize";
import { metabaseParaLinhas } from "@/lib/metabase-map";
import type { LinhaMetabase } from "@/lib/metabase";
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
  /** Exercícios presentes na carga (a pré-visualização mostra apenas um). */
  anos: number[];
  /** Exercício efetivamente exibido no payload. */
  anoExibido: number;
  empresaExibida: string;
};

const FONTE_METABASE = "Metabase (consulta oficial)";

export async function importarLocalmente(arquivo?: File): Promise<ResultadoLocal> {
  if (arquivo) return importarPlanilhaLocal(arquivo);

  const resposta = await fetch("/api/metabase", { credentials: "same-origin" });
  const corpo = (await resposta.json().catch(() => ({}))) as {
    ok?: boolean;
    linhas?: LinhaMetabase[];
    error?: string;
  };
  if (!resposta.ok || !corpo.ok || !corpo.linhas) {
    throw new Error(corpo.error ?? "Não foi possível acessar a consulta oficial.");
  }

  const n = metabaseParaLinhas(corpo.linhas);
  if (n.rejeitadas.length > 0) {
    return {
      payload: vazioLocal(FONTE_METABASE),
      total: n.total,
      importadas: 0,
      rejeitadas: n.rejeitadas,
      anos: [],
      anoExibido: anoExercicio(),
      empresaExibida: "02MT",
    };
  }
  return montar(n.linhas, n.total, FONTE_METABASE);
}

async function importarPlanilhaLocal(arquivo: File): Promise<ResultadoLocal> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(new Uint8Array(await arquivo.arrayBuffer()), { type: "array" });
  const nome = wb.SheetNames[0];
  const aba = nome ? wb.Sheets[nome] : undefined;
  if (!aba) throw new Error("Planilha sem abas de dados.");
  const matriz = XLSX.utils.sheet_to_json<(string | number | null)[]>(aba, {
    header: 1,
    raw: true,
    defval: "",
  });
  const fonte = `Planilha (contingência) — ${arquivo.name}`;
  const n = normalizarMatriz(matriz, { anoPadrao: anoExercicio() });
  if (n.rejeitadas.length > 0) {
    return {
      payload: vazioLocal(fonte),
      total: n.total,
      importadas: 0,
      rejeitadas: n.rejeitadas,
      anos: [],
      anoExibido: anoExercicio(),
      empresaExibida: "02MT",
    };
  }
  return montar(n.linhas, n.total, fonte);
}

/**
 * Agrega as linhas de UM exercício e UMA empresa. A chave de agregação inclui
 * ano e empresa, e o payload é filtrado antes de agregar — exercícios diferentes
 * nunca são somados sob o mesmo rótulo (carga histórica pode ter vários anos).
 */
function montar(linhas: LinhaNormalizada[], total: number, fonte: string): ResultadoLocal {
  const anos = [...new Set(linhas.map((l) => l.ano))].sort();
  const preferido = anoExercicio();
  const ano = anos.includes(preferido) ? preferido : (anos[anos.length - 1] ?? preferido);
  const empresasDoAno = [...new Set(linhas.filter((l) => l.ano === ano).map((l) => l.codEmpresa))];
  const empresa = empresasDoAno.includes("02MT") ? "02MT" : (empresasDoAno[0] ?? "02MT");

  const doRecorte = linhas.filter((l) => l.ano === ano && l.codEmpresa === empresa);

  const cc: string[] = [];
  const item: string[] = [];
  const conta: string[] = [];
  const mCC = new Map<string, number>();
  const mItem = new Map<string, number>();
  const mConta = new Map<string, number>();

  const despesa = blocoVazio();
  const receita = blocoVazio();
  const chaves = new Map<string, number>();

  for (const l of doRecorte) {
    const b = l.origem === "RECEITA" ? receita : despesa;
    const iCC = indice(cc, mCC, rotulo(l.codCentroCusto, l.centroCusto));
    const iItem = indice(item, mItem, rotulo(l.codItem, l.item));
    const iConta = indice(conta, mConta, rotulo(l.codConta, l.conta));
    const chave = `${l.ano}|${l.codEmpresa}|${l.origem}|${l.mes}|${iCC}|${iItem}|${iConta}`;
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

  const sufixo = anos.length > 1 ? ` — exercício ${ano} de ${anos.join(", ")}` : "";

  return {
    payload: {
      ano,
      empresa,
      fileName: `${fonte} — leitura local (sem banco)${sufixo}`,
      cc,
      item,
      conta,
      despesa,
      receita,
    },
    total,
    importadas: doRecorte.length,
    rejeitadas: [],
    anos,
    anoExibido: ano,
    empresaExibida: empresa,
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
