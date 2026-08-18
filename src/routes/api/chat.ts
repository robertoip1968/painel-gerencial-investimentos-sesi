import { createFileRoute } from "@tanstack/react-router";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response(JSON.stringify({ error: "IA não configurada." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const body = (await request.json()) as { messages: UIMessage[]; contexto?: string };

        const gateway = createOpenAICompatible({
          name: "lovable",
          baseURL: "https://ai.gateway.lovable.dev/v1",
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        });

        const result = streamText({
          model: gateway("google/gemini-3.7-flash"),
          system: `Você é o analista virtual do Painel Gerencial de Investimentos do SESI/MT.
Responda SEMPRE em português do Brasil, de forma objetiva e executiva (2 a 6 frases ou uma lista curta).
Use exclusivamente os dados do recorte atual do painel fornecidos abaixo — nunca invente números.
Se a pergunta exigir um dado que não está no contexto, diga o que falta e sugira o filtro a aplicar no painel.
Formate valores como "R$ X,XX mi" e percentuais com uma casa decimal.
Para projeções de encerramento e déficit, use o forecast (ritmo médio x 12) e explique a premissa em uma frase.

===== DADOS DO PAINEL =====
${body.contexto ?? "(sem contexto disponível)"}
===========================`,
          messages: await convertToModelMessages(body.messages ?? []),
        });

        return result.toUIMessageStreamResponse();
      },
    },
  },
});
