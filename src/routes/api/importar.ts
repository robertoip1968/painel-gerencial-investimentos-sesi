import { createFileRoute } from "@tanstack/react-router";

const json = { "Content-Type": "application/json" };
const MAX_BYTES = 50 * 1024 * 1024; // contingência: planilha de até 50 MB

export const Route = createFileRoute("/api/importar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { sessaoDaRequisicao, respostaNaoAutorizado } = await import("@/lib/auth.server");
        const sessao = sessaoDaRequisicao(request);
        if (!sessao) return respostaNaoAutorizado();

        const tipo = request.headers.get("content-type") ?? "";
        const contingencia = tipo.includes("multipart/form-data");

        let origemNome: string;
        let normalizado: {
          linhas: import("@/lib/import-normalize").LinhaNormalizada[];
          rejeitadas: { linha: number; motivo: string }[];
          total: number;
        };

        if (contingencia) {
          // ---- Fonte de contingência: planilha .xlsx enviada pelo usuário ----
          let arquivo: File | null = null;
          try {
            const form = await request.formData();
            const f = form.get("arquivo");
            if (f instanceof File) arquivo = f;
          } catch {
            arquivo = null;
          }
          if (!arquivo) {
            return new Response(JSON.stringify({ error: "Nenhum arquivo enviado." }), {
              status: 400,
              headers: json,
            });
          }
          if (!/\.xlsx$/i.test(arquivo.name)) {
            return new Response(
              JSON.stringify({ error: "Formato inválido: envie um arquivo .xlsx." }),
              { status: 400, headers: json },
            );
          }
          if (arquivo.size > MAX_BYTES) {
            return new Response(JSON.stringify({ error: "Arquivo acima do limite de 50 MB." }), {
              status: 413,
              headers: json,
            });
          }

          const XLSX = await import("xlsx");
          const { normalizarMatriz } = await import("@/lib/import-normalize");
          const anoPadrao = Number(process.env["PAINEL_ANO_PADRAO"] ?? new Date().getFullYear());
          origemNome = `Planilha (contingência) — ${arquivo.name}`;
          try {
            const wb = XLSX.read(new Uint8Array(await arquivo.arrayBuffer()), { type: "array" });
            const nome = wb.SheetNames[0];
            const aba = nome ? wb.Sheets[nome] : undefined;
            if (!aba) throw new Error("Planilha sem abas de dados.");
            const matriz = XLSX.utils.sheet_to_json<(string | number | null)[]>(aba, {
              header: 1,
              raw: true,
              defval: "",
            });
            normalizado = normalizarMatriz(matriz, { anoPadrao });
          } catch (e) {
            return new Response(
              JSON.stringify({
                error: e instanceof Error ? e.message : "Não foi possível ler a planilha.",
              }),
              { status: 422, headers: json },
            );
          }
        } else {
          // ---- Fonte oficial: consulta pública do Metabase ----
          const { buscarLinhasMetabase } = await import("@/lib/metabase.server");
          const { metabaseParaLinhas } = await import("@/lib/metabase-map");
          origemNome = "Metabase (consulta oficial)";

          let linhas;
          try {
            linhas = await buscarLinhasMetabase();
          } catch (e) {
            return new Response(
              JSON.stringify({
                error:
                  e instanceof Error
                    ? e.message
                    : "Não foi possível ler os dados da consulta oficial.",
              }),
              { status: 502, headers: json },
            );
          }

          try {
            normalizado = metabaseParaLinhas(linhas);
          } catch (e) {
            return new Response(
              JSON.stringify({
                error: e instanceof Error ? e.message : "Dados fora do layout esperado.",
              }),
              { status: 422, headers: json },
            );
          }
        }

        // Tudo ou nada: qualquer registro inválido cancela a importação inteira.
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
