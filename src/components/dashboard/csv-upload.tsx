import { useRef, useState } from "react";
import { AlertTriangle, FileSpreadsheet, Upload, X } from "lucide-react";
import { parseDashboardCsv } from "@/lib/csv-import";
import { useDataset } from "@/lib/dataset-store";
import { brl } from "@/lib/dashboard-data";

export function CsvUpload() {
  const { dataset, setDataset } = useDataset();
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setErro(null);
    try {
      const text = await file.text();
      setDataset(parseDashboardCsv(text, file.name));
    } catch (e) {
      setDataset(null);
      setErro(e instanceof Error ? e.message : "Falha ao ler o arquivo.");
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-navy">
            Fonte de Dados
            <span className="ml-1 font-normal normal-case text-muted-foreground">
              {dataset ? "(CSV carregado nesta sessão)" : "(dados de demonstração)"}
            </span>
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Suba um CSV com colunas de Centro de Custo, Item, Conta Contábil, Previsto,
            Comprometido e Realizado. Separador , ou ; e valores em formato brasileiro.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90"
          >
            <Upload className="size-4" /> Subir CSV
          </button>
          {dataset ? (
            <button
              onClick={() => setDataset(null)}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="size-4" /> Remover
            </button>
          ) : null}
        </div>
      </div>

      {dataset ? (
        <div className="mt-3 flex flex-wrap items-center gap-4 rounded-md bg-muted/50 px-3 py-2 text-xs">
          <span className="flex items-center gap-2 font-medium text-navy">
            <FileSpreadsheet className="size-4 text-brand" /> {dataset.fileName}
          </span>
          <span className="text-muted-foreground">{dataset.linhas} linhas</span>
          <span className="text-muted-foreground">
            Previsto <strong className="text-foreground">R$ {brl(dataset.previsto)}</strong>
          </span>
          <span className="text-muted-foreground">
            Comprometido <strong className="text-foreground">R$ {brl(dataset.comprometido)}</strong>
          </span>
          <span className="text-muted-foreground">
            Realizado <strong className="text-foreground">R$ {brl(dataset.realizado)}</strong>
          </span>
        </div>
      ) : null}

      {erro ? (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-crit/40 bg-crit/5 px-3 py-2 text-xs text-crit">
          <AlertTriangle className="mt-px size-4 shrink-0" /> {erro}
        </p>
      ) : null}
    </section>
  );
}
