const KEY = "sesimt-sessao";

export type Sessao = { usuario: string; em: string };

export function getSessao(): Sessao | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Sessao) : null;
  } catch {
    return null;
  }
}

export function entrar(usuario: string) {
  window.localStorage.setItem(KEY, JSON.stringify({ usuario, em: new Date().toISOString() }));
}

export function sair() {
  window.localStorage.removeItem(KEY);
}
