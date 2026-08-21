import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, LogIn, User } from "lucide-react";
import { entrar, getSessao } from "@/lib/auth-local";
import bgAsset from "@/assets/sesi-login.png.asset.json";
import logoAsset from "@/assets/fiemt-sesi-logo.png.asset.json";

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
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    void getSessao().then((s) => {
      if (s) void navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const u = usuario.trim();
    if (!u || !senha) {
      setErro("Informe usuário e senha.");
      return;
    }
    setErro("");
    setEnviando(true);
    const r = await entrar(u, senha);
    setEnviando(false);
    if (!r.ok) {
      setErro(r.erro ?? "Usuário ou senha inválidos.");
      return;
    }
    void navigate({ to: "/", replace: true });
  }

  return (
    <div className="relative min-h-screen bg-navy text-navy-foreground">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgAsset.url})` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-navy/80" aria-hidden />
      <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">

        <img
          src={logoAsset.url}
          alt="FIEMT SESI MT – 50 anos"
          className="relative h-20 w-auto self-start rounded-lg bg-white px-4 py-3 object-contain"
        />
        <div className="relative max-w-md space-y-4">
          <h2 className="text-3xl font-bold uppercase leading-tight">
            Painel Gerencial de Investimentos
          </h2>
          <p className="text-navy-foreground/70">
            Previsto, realizado, saldo e tendência de encerramento do exercício — por
            centro de custo, item e conta contábil.
          </p>
        </div>
        <p className="relative text-xs text-navy-foreground/50">
          Uso interno • Serviço Social da Indústria – Mato Grosso
        </p>
      </div>

      <div className="flex items-center justify-center p-6 text-foreground">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 flex justify-center lg:hidden">
            <img src={logoAsset.url} alt="FIEMT SESI MT – 50 anos" className="h-12 w-auto object-contain" />
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
              disabled={enviando}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-60"
            >
              <LogIn className="size-4" /> {enviando ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground">
            Acesso restrito. Credenciais validadas no servidor do SESI/MT.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
