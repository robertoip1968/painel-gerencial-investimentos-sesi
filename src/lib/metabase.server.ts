import { METABASE_URL_PADRAO, type LinhaMetabase } from "@/lib/metabase";

/** URL efetiva (permite sobrescrever por variável de ambiente no on-premise). */
export function urlMetabase(): string {
  return process.env["METABASE_JSON_URL"] || METABASE_URL_PADRAO;
}

const tlsInseguro = () => process.env["METABASE_TLS_INSECURE"] === "true";

/**
 * Busca com validação TLS padrão. Quando (e somente quando) METABASE_TLS_INSECURE=true,
 * a exceção de certificado vale apenas para ESTA requisição, via agente HTTPS dedicado.
 * Nenhuma outra conexão do processo é afetada (nada de NODE_TLS_REJECT_UNAUTHORIZED).
 */
async function buscarJson(url: string, timeoutMs: number): Promise<unknown> {
  if (!tlsInseguro() || !url.startsWith("https:")) {
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) throw new Error(`O Metabase respondeu com status ${r.status}.`);
    return await r.json();
  }

  const https = await import("node:https");
  const agente = new https.Agent({ rejectUnauthorized: false, keepAlive: false });

  return await new Promise<unknown>((resolve, reject) => {
    const req = https.request(
      url,
      { agent: agente, method: "GET", headers: { Accept: "application/json" }, timeout: timeoutMs },
      (res) => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          agente.destroy();
          reject(new Error(`O Metabase respondeu com status ${res.statusCode}.`));
          return;
        }
        const partes: Buffer[] = [];
        res.on("data", (c: Buffer) => partes.push(c));
        res.on("end", () => {
          agente.destroy();
          try {
            resolve(JSON.parse(Buffer.concat(partes).toString("utf8")));
          } catch {
            reject(new Error("Resposta do Metabase não é um JSON válido."));
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Tempo esgotado ao consultar o Metabase.")));
    req.on("error", (e) => {
      agente.destroy();
      reject(e);
    });
    req.end();
  });
}

/** Busca as linhas da pergunta pública do Metabase. */
export async function buscarLinhasMetabase(): Promise<LinhaMetabase[]> {
  const url = urlMetabase();

  let dados: unknown;
  try {
    dados = await buscarJson(url, 180_000);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "falha de rede.";
    if (/status \d+/.test(msg)) throw new Error(msg);
    throw new Error(`Não foi possível acessar a consulta oficial do Metabase. ${msg}`);
  }

  if (!Array.isArray(dados)) {
    throw new Error("Resposta do Metabase fora do formato esperado (lista de registros JSON).");
  }
  return dados as LinhaMetabase[];
}
