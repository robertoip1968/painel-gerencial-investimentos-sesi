/**
 * Fonte oficial dos dados do painel: pergunta pública do Metabase (JSON).
 * O endpoint devolve um array de objetos, onde cada chave é o nome da coluna.
 */
export const METABASE_URL_PADRAO =
  "https://metabase.sfiemt.ind.br:3443/public/question/f2205a28-4100-4173-af6b-6bd6a8f669bf.json";

export type LinhaMetabase = Record<string, string | number | null | undefined>;

/** Converte o array de objetos do Metabase na matriz [cabeçalho, ...linhas]. */
export function jsonParaMatriz(
  rows: LinhaMetabase[],
): (string | number | null | undefined)[][] {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("O link do Metabase não retornou nenhuma linha de dados.");
  }
  const headers: string[] = [];
  const vistos = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r ?? {})) {
      if (!vistos.has(k)) {
        vistos.add(k);
        headers.push(k);
      }
    }
  }
  if (headers.length === 0) {
    throw new Error("O link do Metabase não retornou colunas reconhecíveis.");
  }
  return [headers, ...rows.map((r) => headers.map((h) => r?.[h] ?? ""))];
}
