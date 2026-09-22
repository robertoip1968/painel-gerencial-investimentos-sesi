import { METABASE_URL_PADRAO, type LinhaMetabase } from "@/lib/metabase";

/** URL efetiva (permite sobrescrever por variável de ambiente no on-premise). */
export function urlMetabase(): string {
  return process.env["METABASE_JSON_URL"] || METABASE_URL_PADRAO;
}

/** Busca as linhas da pergunta pública do Metabase. */
export async function buscarLinhasMetabase(): Promise<LinhaMetabase[]> {
  const url = urlMetabase();

  // Certificado interno do SESI/MT: permite ignorar a validação quando configurado.
  if (process.env["METABASE_TLS_INSECURE"] === "true") {
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
  }

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    throw new Error(
      `Não foi possível acessar o Metabase (${url}). ` +
        (e instanceof Error ? e.message : "falha de rede."),
    );
  }

  if (!resposta.ok) {
    throw new Error(`O Metabase respondeu com status ${resposta.status}.`);
  }

  const dados = (await resposta.json().catch(() => null)) as unknown;
  if (!Array.isArray(dados)) {
    throw new Error("Resposta do Metabase fora do formato esperado (lista de registros JSON).");
  }
  return dados as LinhaMetabase[];
}
