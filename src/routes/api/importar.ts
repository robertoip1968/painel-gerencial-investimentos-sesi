import { createFileRoute } from "@tanstack/react-router";

const json = { "Content-Type": "application/json" };
const MAX_BYTES = 50 * 1024 * 1024;

export const Route = createFileRoute("/api/importar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { sessaoDaRequisicao, respostaNaoAutorizado } = await import("@/lib/auth.server");
        const sessao = sessaoDaRequisicao(request);
        if (!sessao) return respostaNaoAutorizado();

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return new Response(JSON.stringify({ error: "Envio inválido (multipart esperado)." }), {
            status: 400,
            headers: json,
          });
        }

        const file = form.get("arquivo");
        if (!(file instanceof File)) {
          return new Response(JSON.stringify({ error: "Arquivo não enviado." }), {
            status: 400,
            headers: json,
          });
        }
        if (file.size > MAX_BYTES) {
          return new Response(JSON.stringify({ error: "Arquivo maior que 50 MB." }), {
            status: 413,
            headers: json,
          });
        }

        const nome = file.name;
        const ext = nome.toLowerCase().split(".").pop() ?? "";
        if (ext !== "xlsx") {
          return new Response(
            JSON.stringify({ error: "Formato não suportado. Envie um arquivo Excel .xlsx." }),
            { status: 400, headers: json },
          );
        }

        const { csvParaMatriz, normalizarMatriz } = await import("@/lib/import-normalize");
        const anoPadrao = Number(process.env["PAINEL_ANO_PADRAO"] ?? new Date().getFullYear());

        let matriz: (string | number | null | undefined)[][];
        try {
          if (ext === "csv") {
            matriz = csvParaMatriz(await file.text());
          } else {
            const XLSX = await import("xlsx");
            const buf = new Uint8Array(await file.arrayBuffer());
            const wb = XLSX.read(buf, { type: "array" });
            const sheetName = wb.SheetNames[0];
            if (!sheetName) throw new Error("Planilha sem abas.");
            const sheet = wb.Sheets[sheetName]!;
            matriz = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as (
              | string
              | number
            )[][];
          }
        } catch (e) {
          return new Response(
            JSON.stringify({
              error: e instanceof Error ? e.message : "Não foi possível ler o arquivo.",
            }),
            { status: 400, headers: json },
          );
        }

        let normalizado;
        try {
          normalizado = normalizarMatriz(matriz, { anoPadrao });
        } catch (e) {
          return new Response(
            JSON.stringify({
              error: e instanceof Error ? e.message : "Arquivo fora do layout esperado.",
            }),
            { status: 422, headers: json },
          );
        }

        // Tudo ou nada: qualquer linha inválida cancela a importação inteira.
        if (normalizado.rejeitadas.length > 0) {
          return new Response(
            JSON.stringify({
              ok: false,
              arquivo: nome,
              linhasEncontradas: normalizado.total,
              linhasImportadas: 0,
              linhasRejeitadas: normalizado.rejeitadas.length,
              error: `Importação cancelada: ${normalizado.rejeitadas.length} de ${normalizado.total} linha(s) não passaram na validação. A base anterior foi mantida.`,
              detalhes: normalizado.rejeitadas
                .slice(0, 20)
                .map((r) => `Linha ${r.linha}: ${r.motivo}`),
            }),
            { status: 422, headers: json },
          );
        }

        const { importarLancamentos } = await import("@/lib/db.server");
        const resultado = await importarLancamentos({
          arquivo: nome,
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
