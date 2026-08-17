import fatos from "@/data/sesi2026-fatos.json";
import type { Dataset } from "@/lib/csv-import";
import type { SegRow } from "@/lib/dashboard-data";

type Bloco = {
  n: number;
  mes: number[];
  cc: number[];
  item: number[];
  conta: number[];
  linhas: number[];
  previsto: number[];
  realizado: number[];
};

const base = fatos as unknown as {
  ano: number;
  empresa: string;
  fileName: string;
  cc: string[];
  item: string[];
  conta: string[];
  despesa: Bloco;
  receita: Bloco;
};

export type Filtros = {
  mesIni: number;
  mesFim: number;
  cc: string;
  item: string;
  conta: string;
};

export const TODOS = "__todos__";

export const filtrosPadrao: Filtros = {
  mesIni: 1,
  mesFim: 12,
  cc: TODOS,
  item: TODOS,
  conta: TODOS,
};

export const opcoes = {
  cc: [...base.cc].sort((a, b) => a.localeCompare(b, "pt-BR")),
  item: [...base.item].sort((a, b) => a.localeCompare(b, "pt-BR")),
  conta: [...base.conta].sort((a, b) => a.localeCompare(b, "pt-BR")),
};

export const FATOS_ANO = base.ano;
export const FATOS_FILE = base.fileName;

export function filtrosAtivos(f: Filtros) {
  return (
    f.mesIni !== 1 ||
    f.mesFim !== 12 ||
    f.cc !== TODOS ||
    f.item !== TODOS ||
    f.conta !== TODOS
  );
}

function idxOf(list: string[], value: string) {
  return value === TODOS ? -1 : list.indexOf(value);
}

function build(b: Bloco, f: Filtros, fileName: string): Dataset {
  const ccIdx = idxOf(base.cc, f.cc);
  const itemIdx = idxOf(base.item, f.item);
  const contaIdx = idxOf(base.conta, f.conta);

  const mensal = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, previsto: 0, realizado: 0 }));
  const mapCC = new Map<string, SegRow>();
  const mapItem = new Map<string, SegRow>();
  const mapConta = new Map<string, SegRow>();
  let linhas = 0;
  let previsto = 0;
  let realizado = 0;

  const add = (map: Map<string, SegRow>, nome: string, grupo: string, p: number, r: number) => {
    const cur = map.get(nome) ?? { nome, grupo, previsto: 0, comprometido: 0, realizado: 0 };
    cur.previsto += p;
    cur.realizado += r;
    map.set(nome, cur);
  };

  for (let i = 0; i < b.n; i++) {
    const m = b.mes[i]!;
    if (m < f.mesIni || m > f.mesFim) continue;
    if (ccIdx >= 0 && b.cc[i] !== ccIdx) continue;
    if (itemIdx >= 0 && b.item[i] !== itemIdx) continue;
    if (contaIdx >= 0 && b.conta[i] !== contaIdx) continue;

    const p = b.previsto[i]!;
    const r = b.realizado[i]!;
    linhas += b.linhas[i]!;
    previsto += p;
    realizado += r;
    mensal[m - 1]!.previsto += p;
    mensal[m - 1]!.realizado += r;

    const nomeCC = base.cc[b.cc[i]!]!;
    const nomeItem = base.item[b.item[i]!]!;
    const nomeConta = base.conta[b.conta[i]!]!;
    add(mapCC, nomeCC, "DESPESA", p, r);
    add(mapItem, nomeItem, nomeCC, p, r);
    add(mapConta, nomeConta, nomeItem, p, r);
  }

  const arr = (m: Map<string, SegRow>) => [...m.values()].sort((a, x) => x.previsto - a.previsto);

  return {
    fileName,
    linhas,
    previsto,
    comprometido: 0,
    realizado,
    mensal,
    segCentroCusto: arr(mapCC),
    segItem: arr(mapItem),
    segConta: arr(mapConta),
  };
}

export function despesaFiltrada(f: Filtros): Dataset {
  return build(base.despesa, f, base.fileName);
}

export function receitaFiltrada(f: Filtros) {
  const d = build(base.receita, f, base.fileName);
  return { previsto: d.previsto, realizado: d.realizado, linhas: d.linhas };
}
