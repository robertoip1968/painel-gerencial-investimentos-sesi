import { Pool, type PoolClient } from "pg";
import type { LinhaNormalizada } from "@/lib/import-normalize";

export type LinhaFato = {
  tipo: "DESPESA" | "RECEITA";
  mes: number;
  centro_custo: string;
  item_contabil: string;
  conta_contabil: string;
  linhas: number;
  previsto: number;
  realizado: number;
};

let pool: Pool | null = null;

/** Pool reutilizável. Retorna null quando DATABASE_URL não está configurada. */
export function getPool(): Pool | null {
  const url = process.env["DATABASE_URL"];
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
      ...(url.includes("sslmode=disable") ? {} : { ssl: { rejectUnauthorized: false } }),
    });
    pool.on("error", (e) => console.error("Erro no pool do Postgres:", e.message));
  }
  return pool;
}

export function bancoConfigurado() {
  return Boolean(process.env["DATABASE_URL"]);
}

/** Ping rápido para o health check. */
export async function pingBanco(): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

const SQL_FATOS = `
  SELECT tipo, mes, centro_custo, item_contabil, conta_contabil,
         linhas::int AS linhas,
         previsto::float8 AS previsto,
         realizado::float8 AS realizado
  FROM dash_sesi.vw_fatos
  WHERE ano = $1
`;

/** Lê a visão agregada dash_sesi.vw_fatos. */
export async function lerFatosDoBanco(ano: number): Promise<LinhaFato[] | null> {
  const p = getPool();
  if (!p) return null;
  const res = await p.query(SQL_FATOS, [ano]);
  return res.rows as LinhaFato[];
}

export type FatosPayloadDb = {
  ano: number;
  empresa: string;
  fileName: string;
  cc: string[];
  item: string[];
  conta: string[];
  despesa: BlocoDb;
  receita: BlocoDb;
};

type BlocoDb = {
  n: number;
  mes: number[];
  cc: number[];
  item: number[];
  conta: number[];
  linhas: number[];
  previsto: number[];
  realizado: number[];
};

/** Converte as linhas da view no payload comprimido consumido pelo painel. */
export function montarPayload(ano: number, rows: LinhaFato[]): FatosPayloadDb {
  const cc: string[] = [];
  const item: string[] = [];
  const conta: string[] = [];
  const idx = (list: string[], v: string) => {
    const i = list.indexOf(v);
    if (i >= 0) return i;
    list.push(v);
    return list.length - 1;
  };
  const bloco = (): BlocoDb => ({
    n: 0,
    mes: [],
    cc: [],
    item: [],
    conta: [],
    linhas: [],
    previsto: [],
    realizado: [],
  });
  const despesa = bloco();
  const receita = bloco();

  for (const r of rows) {
    const b = r.tipo === "RECEITA" ? receita : despesa;
    b.mes.push(r.mes);
    b.cc.push(idx(cc, r.centro_custo));
    b.item.push(idx(item, r.item_contabil));
    b.conta.push(idx(conta, r.conta_contabil));
    b.linhas.push(r.linhas);
    b.previsto.push(Number(r.previsto));
    b.realizado.push(Number(r.realizado));
    b.n += 1;
  }

  return {
    ano,
    empresa: "02MT",
    fileName: "PostgreSQL — dash_sesi",
    cc,
    item,
    conta,
    despesa,
    receita,
  };
}

// ------------------------- Importação -------------------------

export type ResultadoImportacao = {
  ok: boolean;
  importacaoId: number | null;
  arquivo: string;
  linhasEncontradas: number;
  linhasImportadas: number;
  linhasRejeitadas: number;
  anos: number[];
  dataHora: string;
  erro?: string;
  detalhes?: string[];
};

const LOTE = 500;

/**
 * Grava as linhas normalizadas em staging, valida e promove para
 * dash_sesi.lancamentos dentro de uma única transação.
 * Em caso de erro faz ROLLBACK — a base anterior continua íntegra.
 */
export async function importarLancamentos(params: {
  arquivo: string;
  usuario: string;
  linhas: LinhaNormalizada[];
  rejeitadas: { linha: number; motivo: string }[];
  totalLidas: number;
}): Promise<ResultadoImportacao> {
  const p = getPool();
  const base: ResultadoImportacao = {
    ok: false,
    importacaoId: null,
    arquivo: params.arquivo,
    linhasEncontradas: params.totalLidas,
    linhasImportadas: 0,
    linhasRejeitadas: params.rejeitadas.length,
    anos: [],
    dataHora: new Date().toISOString(),
  };

  if (!p) return { ...base, erro: "Banco de dados não configurado (DATABASE_URL ausente)." };
  if (params.linhas.length === 0)
    return {
      ...base,
      erro: "Nenhuma linha válida encontrada no arquivo.",
      detalhes: params.rejeitadas.slice(0, 10).map((r) => `Linha ${r.linha}: ${r.motivo}`),
    };

  const anos = [...new Set(params.linhas.map((l) => l.ano))].sort();
  let client: PoolClient | null = null;
  let importacaoId: number | null = null;

  try {
    client = await p.connect();

    const reg = await client.query(
      `INSERT INTO dash_sesi.importacoes
         (nome_arquivo, usuario, ano, quantidade_linhas, quantidade_rejeitada, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDENTE') RETURNING id`,
      [params.arquivo, params.usuario, anos[0] ?? null, params.totalLidas, params.rejeitadas.length],
    );
    importacaoId = Number(reg.rows[0].id);

    await client.query("BEGIN");
    await client.query(`DELETE FROM dash_sesi.fin_shift_staging WHERE importacao_id = $1`, [
      importacaoId,
    ]);

    for (let i = 0; i < params.linhas.length; i += LOTE) {
      const lote = params.linhas.slice(i, i + LOTE);
      const valores: unknown[] = [];
      const trechos = lote.map((l, k) => {
        const b = k * 11;
        valores.push(
          importacaoId,
          i + k + 2,
          String(l.ano),
          String(l.mes),
          l.tipo,
          l.empresa,
          l.centroCusto,
          l.item,
          l.conta,
          String(l.previsto),
          String(l.comprometido),
        );
        return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11})`;
      });
      // realizado entra em um segundo passo para manter a lista de parâmetros curta
      await client.query(
        `INSERT INTO dash_sesi.fin_shift_staging
           (importacao_id, linha_origem, ano, mes, tipo, empresa, centro_custo,
            item_contabil, conta_contabil, previsto, comprometido)
         VALUES ${trechos.join(",")}`,
        valores,
      );
      await Promise.all(
        lote.map((l, k) =>
          client!.query(
            `UPDATE dash_sesi.fin_shift_staging SET realizado = $1
             WHERE importacao_id = $2 AND linha_origem = $3`,
            [String(l.realizado), importacaoId, i + k + 2],
          ),
        ),
      );
    }

    const invalidas = await client.query(
      `SELECT count(*)::int AS n FROM dash_sesi.fin_shift_staging
        WHERE importacao_id = $1
          AND (centro_custo IS NULL OR centro_custo = ''
               OR mes::int NOT BETWEEN 1 AND 12)`,
      [importacaoId],
    );
    if (invalidas.rows[0].n > 0) {
      throw new Error(`${invalidas.rows[0].n} linha(s) inválida(s) detectada(s) na validação final.`);
    }

    // substitui integralmente os exercícios presentes no arquivo
    await client.query(`DELETE FROM dash_sesi.lancamentos WHERE ano = ANY($1::smallint[])`, [anos]);

    const promovidas = await client.query(
      `INSERT INTO dash_sesi.lancamentos
         (ano, mes, tipo, empresa, centro_custo, item_contabil, conta_contabil,
          previsto, comprometido, realizado, fonte, importacao_id)
       SELECT ano::smallint, mes::smallint, tipo, empresa, centro_custo,
              item_contabil, conta_contabil,
              coalesce(previsto,'0')::numeric,
              coalesce(comprometido,'0')::numeric,
              coalesce(realizado,'0')::numeric,
              $2, $1
         FROM dash_sesi.fin_shift_staging
        WHERE importacao_id = $1`,
      [importacaoId, params.arquivo],
    );

    await client.query(`DELETE FROM dash_sesi.fin_shift_staging WHERE importacao_id = $1`, [
      importacaoId,
    ]);
    await client.query(
      `UPDATE dash_sesi.importacoes
          SET status = 'SUCESSO', quantidade_importada = $2
        WHERE id = $1`,
      [importacaoId, promovidas.rowCount ?? 0],
    );
    await client.query("COMMIT");

    return {
      ...base,
      ok: true,
      importacaoId,
      linhasImportadas: promovidas.rowCount ?? 0,
      anos,
      dataHora: new Date().toISOString(),
      ...(params.rejeitadas.length
        ? { detalhes: params.rejeitadas.slice(0, 10).map((r) => `Linha ${r.linha}: ${r.motivo}`) }
        : {}),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha desconhecida na importação.";
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
      if (importacaoId !== null) {
        await client
          .query(
            `UPDATE dash_sesi.importacoes SET status = 'ERRO', mensagem_erro = $2 WHERE id = $1`,
            [importacaoId, msg.slice(0, 1000)],
          )
          .catch(() => {});
      }
    }
    console.error("Importação falhou:", msg);
    return { ...base, importacaoId, erro: msg };
  } finally {
    client?.release();
  }
}

// ---------------------- Carga para o painel ----------------------

export type CargaFatos = {
  fonte: "db" | "local" | "indisponivel" | "vazio";
  payload: FatosPayloadDb | null;
  mensagem?: string;
};

/** Decide a fonte oficial dos fatos conforme o ambiente. */
export async function carregarFatosParaPainel(ano: number): Promise<CargaFatos> {
  const producao = process.env["NODE_ENV"] === "production";

  if (!bancoConfigurado()) {
    return producao
      ? {
          fonte: "indisponivel",
          payload: null,
          mensagem: "Não foi possível carregar os dados do PostgreSQL (conexão não configurada).",
        }
      : { fonte: "local", payload: null };
  }

  try {
    const rows = await lerFatosDoBanco(ano);
    if (!rows || rows.length === 0) {
      return producao
        ? {
            fonte: "vazio",
            payload: null,
            mensagem: `Não há dados importados para o exercício ${ano}.`,
          }
        : { fonte: "local", payload: null };
    }
    return { fonte: "db", payload: montarPayload(ano, rows) };
  } catch (e) {
    console.error("Falha ao ler fatos do Postgres:", e);
    return producao
      ? {
          fonte: "indisponivel",
          payload: null,
          mensagem: "Não foi possível carregar os dados do PostgreSQL.",
        }
      : { fonte: "local", payload: null };
  }
}
