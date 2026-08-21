import { createFileRoute } from "@tanstack/react-router";

type Corpo = {
  pergunta: string;
  contexto?: string;
  filtros?: Record<string, unknown>;
  historico?: { role: "user" | "assistant"; text: string }[];
};

/** Extrai o texto da resposta do fluxo N8N, aceitando os formatos mais comuns. */
function extrairResposta(payload: unknown): string | null {
  if (typeof payload === "string") return payload.trim() || null;
  if (Array.isArray(payload)) return payload.length ? extrairResposta(payload[0]) : null;
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    for (const k of ["resposta", "output", "text", "message", "answer", "reply", "result"]) {
      const v = o[k];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (v && typeof v === "object") {
        const aninhado = extrairResposta(v);
        if (aninhado) return aninhado;
      }
    }
  }
  return null;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const json = (headers: Record<string, string> = {}) => ({
          "Content-Type": "application/json",
          ...headers,
        });

        const { sessaoDaRequisicao, respostaNaoAutorizado } = await import("@/lib/auth.server");
        if (!sessaoDaRequisicao(request)) return respostaNaoAutorizado();

        const webhook = process.env["N8N_WEBHOOK_URL"];
        if (!webhook) {
          // Configuração ausente não é falha de runtime: devolve 200 com aviso
          // para o widget exibir a mensagem sem gerar erro 500 no app.
          return new Response(
            JSON.stringify({
              error:
                "Fluxo N8N não configurado. Cadastre o secret N8N_WEBHOOK_URL com a URL do webhook de produção.",
            }),
            { status: 200, headers: json() },
          );
        }


        const body = (await request.json()) as Corpo;
        if (!body?.pergunta?.trim()) {
          return new Response(JSON.stringify({ error: "Pergunta vazia." }), {
            status: 400,
            headers: json(),
          });
        }

        const auth = process.env["N8N_WEBHOOK_TOKEN"];
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 120_000);

        try {
          const resp = await fetch(webhook, {
            method: "POST",
            headers: json(auth ? { Authorization: `Bearer ${auth}` } : {}),
            body: JSON.stringify({
              pergunta: body.pergunta,
              contexto: body.contexto ?? "",
              filtros: body.filtros ?? {},
              historico: (body.historico ?? []).slice(-8),
              origem: "painel-sesi-mt",
              enviadoEm: new Date().toISOString(),
            }),
            signal: controller.signal,
          });

          const bruto = await resp.text();
          if (!resp.ok) {
            console.error("N8N respondeu", resp.status, bruto.slice(0, 500));
            return new Response(
              JSON.stringify({ error: `O fluxo N8N retornou erro ${resp.status}.` }),
              { status: 502, headers: json() },
            );
          }

          let payload: unknown = bruto;
          try {
            payload = JSON.parse(bruto);
          } catch {
            /* resposta em texto puro */
          }

          const resposta = extrairResposta(payload);
          if (!resposta) {
            return new Response(
              JSON.stringify({
                error:
                  "O fluxo N8N respondeu sem texto. O nó final deve devolver um JSON com o campo \"resposta\".",
              }),
              { status: 502, headers: json() },
            );
          }

          return new Response(JSON.stringify({ resposta }), { status: 200, headers: json() });
        } catch (e) {
          console.error("Falha ao chamar o fluxo N8N:", e);
          return new Response(JSON.stringify({ error: "Não foi possível falar com o fluxo N8N." }), {
            status: 502,
            headers: json(),
          });
        } finally {
          clearTimeout(timer);
        }
      },
    },
  },
});
