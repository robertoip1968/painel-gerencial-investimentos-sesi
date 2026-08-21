import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Loader2, Upload } from "lucide-react";
import { useDataset } from "@/lib/dataset-store";

type Resultado = {
  ok: boolean;
  arquivo: string;
  linhasEncontradas: number;
  linhasImportadas: number;
  linhasRejeitadas: number;
  dataHora: string;
  erro?: string;
  detalhes?: string[];
};

export function AtualizarBase() {
  const { recarregar, fonte, dataset } = useDataset();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [detalhes, setDetalhes] = useState<string[]>([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function enviar(file: File) {
    setErro(null);
    setDetalhes([]);
    setResultado(null);
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const r = await fetch("/api/importar", {
        method: "POST",
        credentials: "same-origin",
        body: fd,
      });
      const j = (await r.json().catch(() => ({}))) as Resultado & { error?: string };
      if (!r.ok || !j.ok) {
        setErro(j.error ?? j.erro ?? "Não foi possível concluir a importação.");
        setDetalhes(j.detalhes ?? []);
        return;
      }
      setResultado(j);
      setDetalhes(j.detalhes ?? []);
      await recarregar();
    } catch {
      setErro("Falha de comunicação com o servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-navy">
            <Database className="size-4" /> Atualização da Base
            <span className="ml-1 font-normal normal-case text-muted-foreground">
              {fonte === "db"
                ? `(PostgreSQL • ${dataset.linhas.toLocaleString("pt-BR")} lançamentos no recorte)`
                : fonte === "local"
                  ? "(dados locais de desenvolvimento)"
                  : "(sem dados oficiais carregados)"}
            </span>
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Envie a planilha SHIFT (.xlsx, .xls ou .csv) com Origem, Cód. Empresa, Ano, Mês, Centro
            de Custo, Item Contábil, Conta Contábil, Previsto e Realizado. A carga é tudo-ou-nada:
            qualquer linha inválida cancela a importação e a base anterior é mantida.
          </p>

        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void enviar(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={enviando}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-60"
          >
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {enviando ? "Importando…" : "Atualizar base de dados"}
          </button>
        </div>
      </div>

      {resultado ? (
        <div className="mt-3 rounded-md border border-ok/40 bg-ok/10 p-3 text-[12px] text-foreground">
          <p className="flex items-center gap-2 font-semibold text-ok">
            <CheckCircle2 className="size-4" /> Importação concluída com sucesso
          </p>
          <p className="mt-1 text-muted-foreground">
            {resultado.arquivo} • {resultado.linhasEncontradas.toLocaleString("pt-BR")} linhas
            encontradas • {resultado.linhasImportadas.toLocaleString("pt-BR")} importadas •{" "}
            {resultado.linhasRejeitadas.toLocaleString("pt-BR")} rejeitadas •{" "}
            {new Date(resultado.dataHora).toLocaleString("pt-BR")}
          </p>
        </div>
      ) : null}

      {erro ? (
        <div className="mt-3 rounded-md border border-crit/40 bg-crit/10 p-3 text-[12px]">
          <p className="flex items-center gap-2 font-semibold text-crit">
            <AlertTriangle className="size-4" /> {erro}
          </p>
        </div>
      ) : null}

      {detalhes.length ? (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[11px] text-muted-foreground">
          {detalhes.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
