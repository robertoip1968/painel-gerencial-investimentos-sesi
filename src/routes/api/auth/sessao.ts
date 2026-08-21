import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/sessao")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { sessaoDaRequisicao } = await import("@/lib/auth.server");
        const s = sessaoDaRequisicao(request);
        return new Response(JSON.stringify(s ? { usuario: s.usuario } : { usuario: null }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
