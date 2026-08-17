import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Dataset } from "@/lib/csv-import";
import { realDataset } from "@/lib/real-data";
import {
  despesaFiltrada,
  filtrosPadrao,
  receitaFiltrada,
  type Filtros,
  filtrosAtivos,
} from "@/lib/facts";

export type RiscoFiltro = "ok" | "warn" | "crit" | "semexec" | null;

type Ctx = {
  dataset: Dataset;
  isUpload: boolean;
  setDataset: (d: Dataset | null) => void;
  filtros: Filtros;
  setFiltro: <K extends keyof Filtros>(k: K, v: Filtros[K]) => void;
  limparFiltros: () => void;
  temFiltro: boolean;
  receita: { previsto: number; realizado: number; linhas: number };
  risco: RiscoFiltro;
  setRisco: (r: RiscoFiltro) => void;
};

const DatasetContext = createContext<Ctx>({
  dataset: realDataset,
  isUpload: false,
  setDataset: () => {},
  filtros: filtrosPadrao,
  setFiltro: () => {},
  limparFiltros: () => {},
  temFiltro: false,
  receita: receitaFiltrada(filtrosPadrao),
  risco: null,
  setRisco: () => {},
});

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [upload, setUpload] = useState<Dataset | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(filtrosPadrao);
  const [risco, setRisco] = useState<RiscoFiltro>(null);

  const setFiltro = useCallback(
    <K extends keyof Filtros>(k: K, v: Filtros[K]) => setFiltros((f) => ({ ...f, [k]: v })),
    [],
  );
  const limparFiltros = useCallback(() => {
    setFiltros(filtrosPadrao);
    setRisco(null);
  }, []);

  const value = useMemo<Ctx>(() => {
    const dataset = upload ?? despesaFiltrada(filtros);
    return {
      dataset,
      isUpload: upload !== null,
      setDataset: setUpload,
      filtros,
      setFiltro,
      limparFiltros,
      temFiltro: filtrosAtivos(filtros),
      receita: receitaFiltrada(filtros),
      risco,
      setRisco,
    };
  }, [upload, filtros, setFiltro, limparFiltros, risco]);

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export const useDataset = () => useContext(DatasetContext);
