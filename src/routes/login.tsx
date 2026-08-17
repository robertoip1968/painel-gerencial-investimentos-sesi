import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, LogIn, User } from "lucide-react";
import { entrar, getSessao } from "@/lib/auth-local";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Acesso ao Painel – SESI MT" },
      {
        name: "description",
        content:
          "Área restrita do Painel Gerencial de Investimentos do SESI MT. Informe usuário e senha para acessar os indicadores.",
      },
      { property: "og:title", content: "Acesso ao Painel – SESI MT" },
      {
        property: "og:description",
        content: "Área restrita do Painel Gerencial de Investimentos do SESI MT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (getSessao()) void navigate({ to: "/", replace: true });
  }, [navigate]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const u = usuario.trim();
    if (!u || !senha) {
      setErro("Informe usuário e senha.");
      return;
    }
    entrar(u);
    void navigate({ to: "/", replace: true });
  }

  return (
    <div className="grid min-h-screen bg-navy text-navy-foreground lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(900px 420px at 15% 10%, var(--brand), transparent 65%), radial-gradient(700px 380px at 85% 90%, var(--brand), transparent 70%)",
          }}
        />
        <span className="relative text-4xl font-extrabold italic tracking-tight">SESI MT</span>
        <div className="relative max-w-md space-y-4">
          <h2 className="text-3xl font-bold uppercase leading-tight">
            Painel Gerencial de Investimentos
          </h2>
          <p className="text-navy-foreground/70">
            Previsto, comprometido, realizado, saldo e tendência de encerramento do exercício — por
            centro de custo, item e conta contábil.
          </p>
        </div>
        <p className="relative text-xs text-navy-foreground/50">
          Uso interno • Serviço Social da Indústria – Mato Grosso
        </p>
      </div>

      <div className="flex items-center justify-center bg-panel p-6 text-foreground">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 lg:hidden">
            <span className="text-2xl font-extrabold italic tracking-tight text-navy">SESI MT</span>
          </div>
          <h1 className="text-xl font-bold uppercase tracking-wide text-navy">Acesso ao painel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe suas credenciais para continuar.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Usuário
              </span>
              <div className="relative mt-1">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  autoComplete="username"
                  maxLength={80}
                  placeholder="seu.usuario"
                  className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Senha
              </span>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  maxLength={128}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
                />
              </div>
            </label>

            {erro ? <p className="text-sm text-crit">{erro}</p> : null}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
            >
              <LogIn className="size-4" /> Entrar
            </button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground">
            Acesso provisório: qualquer usuário e senha são aceitos. O cadastro de usuários será
            habilitado em breve.
          </p>
        </div>
      </div>
    </div>
  );
}
