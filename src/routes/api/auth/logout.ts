import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { cookieDeLogout, usarSecure } = await import("@/lib/auth.server");
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": cookieDeLogout(usarSecure(request)),
          },
        });
      },
    },
  },
});
