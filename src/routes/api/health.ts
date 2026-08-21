import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const { pingBanco, bancoConfigurado } = await import("@/lib/db.server");
        const database = bancoConfigurado() ? ((await pingBanco()) ? "ok" : "error") : "error";
        return new Response(
          JSON.stringify({ status: database === "ok" ? "ok" : "degraded", database }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          },
        );
      },
    },
  },
});
