import { useMemo, useState } from "react";
import { Download, Receipt } from "lucide-react";
import { useDataset } from "@/lib/dataset-store";
import { lancamentosFiltrados, TODOS } from "@/lib/facts";
import { brl } from "@/lib/dashboard-data";
import { MESES } from "@/lib/real-data";

const PAGINA = 50;

export function LancamentosConta() {
  const { filtros, isUpload } = useDataset();
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(PAGINA);

  const ativo = !isUpload && filtros.conta !== TODOS;

  const linhas = useMemo(() => (ativo ? lancamentosFiltrados(filtros) : []), [ativo, filtros]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return linhas;
    return linhas.filter(
      (l) => l.cc.toLowerCase().includes(q) || l.item.toLowerCase().includes(q),
    );
  }, [linhas, busca]);

  if (!ativo) return null;

  const totais = filtradas.reduce(
    (a, l) => ({
      previsto: a.previsto + l.previsto,
      realizado: a.realizado + l.realizado,
      linhas: a.linhas + l.linhas,
    }),
    { previsto: 0, realizado: 0, linhas: 0 },
  );

  function exportar() {
    const head = "Mes;Centro de Custo;Item Contabil;Conta Contabil;Lancamentos;Previsto;Realizado";
    const body = filtradas
      .map((l) =>
        [
          MESES[l.mes - 1],
          l.cc,
          l.item,
          l.conta,
          l.linhas,
          l.previsto.toFixed(2).replace(".", ","),
          l.realizado.toFixed(2).replace(".", ","),
        ].join(";"),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${head}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lancamentos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-navy">
            <Receipt className="size-4 text-brand" /> Lançamentos Contábeis
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Conta <strong className="text-foreground">{filtros.conta}</strong> — detalhamento por
            mês, centro de custo e item contábil ({totais.linhas} registros na planilha).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setLimite(PAGINA);
            }}
            placeholder="Buscar centro de custo ou item…"
            aria-label="Buscar lançamentos"
            className="w-56 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          />
          <button
            onClick={exportar}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            <Download className="size-3.5" /> CSV
          </button>
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 font-medium">Mês</th>
              <th className="py-2 font-medium">Centro de Custo</th>
              <th className="py-2 font-medium">Item Contábil</th>
              <th className="py-2 text-right font-medium">Lanç.</th>
              <th className="py-2 text-right font-medium">Previsto</th>
              <th className="py-2 text-right font-medium">Realizado</th>
              <th className="py-2 text-right font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.slice(0, limite).map((l, i) => (
              <tr key={`${l.mes}-${l.cc}-${l.item}-${i}`} className="border-b border-border/60">
                <td className="py-1.5">{MESES[l.mes - 1]}</td>
                <td className="py-1.5">{l.cc}</td>
                <td className="py-1.5">{l.item}</td>
                <td className="py-1.5 text-right tabular-nums">{l.linhas}</td>
                <td className="py-1.5 text-right tabular-nums">{brl(l.previsto)}</td>
                <td className="py-1.5 text-right tabular-nums">{brl(l.realizado)}</td>
                <td className="py-1.5 text-right tabular-nums">{brl(l.previsto - l.realizado)}</td>
              </tr>
            ))}
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted-foreground">
                  Nenhum lançamento para este recorte.
                </td>
              </tr>
            ) : null}
            <tr className="font-semibold text-navy">
              <td className="py-2" colSpan={3}>
                TOTAL
              </td>
              <td className="py-2 text-right tabular-nums">{totais.linhas}</td>
              <td className="py-2 text-right tabular-nums">{brl(totais.previsto)}</td>
              <td className="py-2 text-right tabular-nums">{brl(totais.realizado)}</td>
              <td className="py-2 text-right tabular-nums">
                {brl(totais.previsto - totais.realizado)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Exibindo {Math.min(limite, filtradas.length)} de {filtradas.length} agrupamentos.
        </span>
        {limite < filtradas.length ? (
          <button
            onClick={() => setLimite((l) => l + PAGINA)}
            className="rounded-md border border-border px-3 py-1 transition-colors hover:bg-muted"
          >
            Carregar mais
          </button>
        ) : null}
      </div>
    </section>
  );
}
