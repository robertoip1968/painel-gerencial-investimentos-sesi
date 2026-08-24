import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

const COOKIE = "painel_sessao";
const MAX_AGE = 60 * 60 * 8; // 8 horas

export type SessaoServidor = { usuario: string; exp: number };

function segredo(): string {
  const s = process.env["PAINEL_SESSION_SECRET"];
  if (s && s.length >= 16) return s;
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("PAINEL_SESSION_SECRET não configurado.");
  }
  // Somente em desenvolvimento: segredo efêmero.
  globalThis.__painelDevSecret ??= randomBytes(32).toString("hex");
  return globalThis.__painelDevSecret;
}

declare global {
  // eslint-disable-next-line no-var
  var __painelDevSecret: string | undefined;
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");

function assinar(payload: string) {
  return createHmac("sha256", segredo()).update(payload).digest("base64url");
}

export function criarToken(usuario: string): string {
  const dados: SessaoServidor = { usuario, exp: Math.floor(Date.now() / 1000) + MAX_AGE };
  const payload = b64(JSON.stringify(dados));
  return `${payload}.${assinar(payload)}`;
}

export function lerToken(token: string | undefined | null): SessaoServidor | null {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const esperado = Buffer.from(assinar(payload));
    const recebido = Buffer.from(sig);
    if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
    const dados = JSON.parse(unb64(payload)) as SessaoServidor;
    if (!dados?.usuario || !dados.exp || dados.exp < Math.floor(Date.now() / 1000)) return null;
    return dados;
  } catch {
    return null;
  }
}

function lerCookieHeader(request: Request, nome: string): string | null {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  for (const parte of raw.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nome) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** Sessão válida da requisição, ou null. */
export function sessaoDaRequisicao(request: Request): SessaoServidor | null {
  return lerToken(lerCookieHeader(request, COOKIE));
}

/**
 * Em HTTPS usamos SameSite=None; Secure para o cookie também funcionar quando o
 * painel é aberto dentro de um iframe (preview do Lovable). Em HTTP (intranet
 * on-premise) mantemos SameSite=Lax, pois None exige Secure.
 */
function atributosDeSite(seguro: boolean) {
  return seguro ? "SameSite=None; Secure" : "SameSite=Lax";
}

export function cookieDeSessao(token: string, seguro: boolean) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; ${atributosDeSite(seguro)}; Max-Age=${MAX_AGE}`;
}

export function cookieDeLogout(seguro: boolean) {
  return `${COOKIE}=; Path=/; HttpOnly; ${atributosDeSite(seguro)}; Max-Age=0`;
}

export function usarSecure(request: Request) {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0]!.trim() === "https";
  return new URL(request.url).protocol === "https:";
}

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Valida usuário/senha contra as variáveis de ambiente administrativas. */
export function validarCredenciais(usuario: string, senha: string): boolean {
  const u = process.env["PAINEL_ADMIN_USER"];
  const p = process.env["PAINEL_ADMIN_PASSWORD"];

  if (u && p && iguais(usuario, u) && iguais(senha, p)) return true;

  // Fora de produção (preview/desenvolvimento) o acesso local sempre funciona,
  // mesmo que as variáveis administrativas estejam definidas com outros valores.
  if (process.env["NODE_ENV"] !== "production") {
    return iguais(usuario, "admin") && iguais(senha, "sesi2026");
  }
  return false;
}

export function respostaNaoAutorizado() {
  return new Response(JSON.stringify({ error: "Não autenticado." }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
