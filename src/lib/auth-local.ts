/**
 * Cliente da autenticação server-side (cookie HttpOnly).
 * Nenhuma credencial é guardada no navegador.
 */

export type Sessao = { usuario: string };

export async function getSessao(): Promise<Sessao | null> {
  try {
    const r = await fetch("/api/auth/sessao", { credentials: "same-origin" });
    if (!r.ok) return null;
    const j = (await r.json()) as { usuario: string | null };
    return j.usuario ? { usuario: j.usuario } : null;
  } catch {
    return null;
  }
}

export async function entrar(usuario: string, senha: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, senha }),
    });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) return { ok: false, erro: j.error ?? "Não foi possível entrar." };
    return { ok: true };
  } catch {
    return { ok: false, erro: "Servidor indisponível." };
  }
}

export async function sair() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
}
