import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  usuario: z.string().min(1).max(80),
  senha: z.string().min(1).max(128),
});

const json = { "Content-Type": "application/json" };

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const {
          validarCredenciais,
          criarToken,
          cookieDeSessao,
          usarSecure,
        } = await import("@/lib/auth.server");

        let corpo: unknown;
        try {
          corpo = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Requisição inválida." }), {
            status: 400,
            headers: json,
          });
        }

        const parsed = schema.safeParse(corpo);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Informe usuário e senha." }), {
            status: 400,
            headers: json,
          });
        }

        const credsConfiguradas =
          !!process.env["PAINEL_ADMIN_USER"] && !!process.env["PAINEL_ADMIN_PASSWORD"];
        if (!credsConfiguradas && process.env["NODE_ENV"] === "production") {
          return new Response(
            JSON.stringify({
              error:
                "Autenticação não configurada no servidor (PAINEL_ADMIN_USER / PAINEL_ADMIN_PASSWORD).",
            }),
            { status: 503, headers: json },
          );
        }


        if (!validarCredenciais(parsed.data.usuario.trim(), parsed.data.senha)) {
          return new Response(JSON.stringify({ error: "Usuário ou senha inválidos." }), {
            status: 401,
            headers: json,
          });
        }

        const token = criarToken(parsed.data.usuario.trim());
        return new Response(JSON.stringify({ usuario: parsed.data.usuario.trim() }), {
          status: 200,
          headers: { ...json, "Set-Cookie": cookieDeSessao(token, usarSecure(request)) },
        });
      },
    },
  },
});
