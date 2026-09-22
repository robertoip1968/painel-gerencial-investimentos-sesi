import { createFileRoute } from "@tanstack/react-router";

const json = { "Content-Type": "application/json" };

/**
 * Proxy autenticado para a pergunta pública do Metabase.
 * Usado pela pré-visualização (leitura local, sem banco) e como diagnóstico.
 */
export const Route = createFileRoute("/api/metabase")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { sessaoDaRequisicao, respostaNaoAutorizado } = await import("@/lib/auth.server");
        if (!sessaoDaRequisicao(request)) return respostaNaoAutorizado();

        const { buscarLinhasMetabase } = await import("@/lib/metabase.server");
        try {
          const linhas = await buscarLinhasMetabase();
          return new Response(JSON.stringify({ ok: true, linhas }), { headers: json });
        } catch (e) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: e instanceof Error ? e.message : "Falha ao consultar o Metabase.",
            }),
            // 200 de propósito: a falha é de rede com o Metabase e é tratada
            // na interface; um 5xx dispararia o overlay de erro da aplicação.
            { status: 200, headers: json },
          );
        }
      },
    },
  },
});
