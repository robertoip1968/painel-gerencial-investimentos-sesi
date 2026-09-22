import { createFileRoute } from "@tanstack/react-router";

const json = { "Content-Type": "application/json" };

export const Route = createFileRoute("/api/importar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { sessaoDaRequisicao, respostaNaoAutorizado } = await import("@/lib/auth.server");
        const sessao = sessaoDaRequisicao(request);
        if (!sessao) return respostaNaoAutorizado();

        const { buscarLinhasMetabase, urlMetabase } = await import("@/lib/metabase.server");
        const { jsonParaMatriz } = await import("@/lib/metabase");
        const { normalizarMatriz } = await import("@/lib/import-normalize");
        const anoPadrao = Number(process.env["PAINEL_ANO_PADRAO"] ?? new Date().getFullYear());
        const origemNome = urlMetabase();

        let matriz: (string | number | null | undefined)[][];
        try {
          matriz = jsonParaMatriz(await buscarLinhasMetabase());
        } catch (e) {
          return new Response(
            JSON.stringify({
              error: e instanceof Error ? e.message : "Não foi possível ler os dados do Metabase.",
            }),
            { status: 502, headers: json },
          );
        }

        let normalizado;
        try {
          normalizado = normalizarMatriz(matriz, { anoPadrao });
        } catch (e) {
          return new Response(
            JSON.stringify({
              error: e instanceof Error ? e.message : "Dados fora do layout esperado.",
            }),
            { status: 422, headers: json },
          );
        }

        // Tudo ou nada: qualquer linha inválida cancela a importação inteira.
        if (normalizado.rejeitadas.length > 0) {
          return new Response(
            JSON.stringify({
              ok: false,
              arquivo: origemNome,
              linhasEncontradas: normalizado.total,
              linhasImportadas: 0,
              linhasRejeitadas: normalizado.rejeitadas.length,
              error: `Importação cancelada: ${normalizado.rejeitadas.length} de ${normalizado.total} registro(s) não passaram na validação. A base anterior foi mantida.`,
              detalhes: normalizado.rejeitadas
                .slice(0, 20)
                .map((r) => `Registro ${r.linha}: ${r.motivo}`),
            }),
            { status: 422, headers: json },
          );
        }

        const { importarLancamentos } = await import("@/lib/db.server");
        const resultado = await importarLancamentos({
          arquivo: origemNome,
          usuario: sessao.usuario,
          linhas: normalizado.linhas,
          rejeitadas: normalizado.rejeitadas,
          totalLidas: normalizado.total,
        });

        return new Response(JSON.stringify(resultado), {
          status: resultado.ok ? 200 : 422,
          headers: json,
        });
      },
    },
  },
});
