import { METABASE_URL_PADRAO, type LinhaMetabase } from "@/lib/metabase";

/** URL efetiva (permite sobrescrever por variável de ambiente no on-premise). */
export function urlMetabase(): string {
  return process.env["METABASE_JSON_URL"] || METABASE_URL_PADRAO;
}

const tlsInseguro = () => process.env["METABASE_TLS_INSECURE"] === "true";

const MAX_REDIRECTS = 5;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

/** GET via node:https com agente dedicado (exceção TLS só aqui), seguindo redirects. */
function getInseguro(
  url: string,
  timeoutMs: number,
  restantes: number,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    void (async () => {
      const https = await import("node:https");
      const agente = new https.Agent({ rejectUnauthorized: false, keepAlive: false });
      const fim = (fn: () => void) => {
        agente.destroy();
        fn();
      };

      const req = https.request(
        url,
        { agent: agente, method: "GET", headers: { Accept: "application/json" }, timeout: timeoutMs },
        (res) => {
          const status = res.statusCode ?? 0;

          if (REDIRECTS.has(status)) {
            const local = res.headers.location;
            res.resume();
            if (!local) {
              fim(() => reject(new Error(`O Metabase respondeu ${status} sem endereço de redirecionamento.`)));
              return;
            }
            if (restantes <= 0) {
              fim(() => reject(new Error("Excesso de redirecionamentos ao consultar o Metabase.")));
              return;
            }
            const destino = new URL(local, url);
            if (destino.protocol !== "https:") {
              fim(() => reject(new Error("Redirecionamento do Metabase para protocolo não suportado.")));
              return;
            }
            agente.destroy();
            getInseguro(destino.toString(), timeoutMs, restantes - 1).then(resolve, reject);
            return;
          }

          if (status < 200 || status >= 300) {
            res.resume();
            fim(() => reject(new Error(`O Metabase respondeu com status ${status}.`)));
            return;
          }

          const partes: Buffer[] = [];
          res.on("data", (c: Buffer) => partes.push(c));
          res.on("end", () => fim(() => resolve(Buffer.concat(partes).toString("utf8"))));
        },
      );
      req.on("timeout", () => req.destroy(new Error("Tempo esgotado ao consultar o Metabase.")));
      req.on("error", (e) => fim(() => reject(e)));
      req.end();
    })().catch(reject);
  });
}

/**
 * Busca com validação TLS padrão. Quando (e somente quando) METABASE_TLS_INSECURE=true,
 * a exceção de certificado vale apenas para ESTA requisição, via agente HTTPS dedicado.
 * Nenhuma outra conexão do processo é afetada (nada de NODE_TLS_REJECT_UNAUTHORIZED).
 */
async function buscarJson(url: string, timeoutMs: number): Promise<unknown> {
  if (!tlsInseguro() || !url.startsWith("https:")) {
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) throw new Error(`O Metabase respondeu com status ${r.status}.`);
    return await r.json();
  }

  const texto = await getInseguro(url, timeoutMs, MAX_REDIRECTS);
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error("Resposta do Metabase não é um JSON válido.");
  }
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
