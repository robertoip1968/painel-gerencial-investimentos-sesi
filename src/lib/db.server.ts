import { Client } from "pg";

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

const SQL = `
  SELECT tipo, mes, centro_custo, item_contabil, conta_contabil,
         linhas::int AS linhas,
         previsto::float8 AS previsto,
         realizado::float8 AS realizado
  FROM painel.vw_fatos
  WHERE ano = $1
`;

/** Lê a visão agregada do Postgres. Retorna null quando DATABASE_URL não está configurada. */
export async function lerFatosDoBanco(ano: number): Promise<LinhaFato[] | null> {
  const url = process.env["DATABASE_URL"];
  if (!url) return null;

  const client = new Client({
    connectionString: url,
    ssl: url.includes("sslmode=disable") ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const res = await client.query(SQL, [ano]);
    return res.rows as LinhaFato[];
  } finally {
    await client.end().catch(() => {});
  }
}
