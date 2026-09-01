import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Dataset } from "@/lib/csv-import";
import {
  aplicarFatos,
  despesaFiltrada,
  filtrosPadrao,
  receitaFiltrada,
  vazio,
  type Filtros,
  filtrosAtivos,
} from "@/lib/facts";
import { carregarFatos } from "@/lib/fatos.functions";
import { aplicarConfigExercicio } from "@/lib/exercicio";

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
  /** Recarrega os fatos direto do PostgreSQL (após importação, por exemplo). */
  recarregar: () => Promise<void>;
  /** DEV/preview: aplica fatos lidos localmente do .xlsx (sem banco). */
  aplicarLocais: (p: FatosPayload) => void;
  carregando: boolean;
  /** Mensagem de indisponibilidade dos dados oficiais (produção). */
  erroDados: string | null;
  fonte: "db" | "local" | "indisponivel" | "vazio";
};

const DatasetContext = createContext<Ctx>({
  dataset: despesaFiltrada(filtrosPadrao),
  isUpload: false,
  setDataset: () => {},
  filtros: filtrosPadrao,
  setFiltro: () => {},
  limparFiltros: () => {},
  temFiltro: false,
  receita: receitaFiltrada(filtrosPadrao),
  risco: null,
  setRisco: () => {},
  recarregar: async () => {},
  carregando: false,
  erroDados: null,
  fonte: "local",
});

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [upload, setUpload] = useState<Dataset | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(filtrosPadrao);
  const [risco, setRisco] = useState<RiscoFiltro>(null);
  const [versao, setVersao] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erroDados, setErroDados] = useState<string | null>(null);
  const [fonte, setFonte] = useState<Ctx["fonte"]>("local");

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await carregarFatos();
      if (r.config) aplicarConfigExercicio(r.config);
      setFonte(r.fonte);
      if (r.fonte === "db" && r.payload) {
        aplicarFatos(r.payload);
        setErroDados(null);
      } else if (r.fonte === "indisponivel" || r.fonte === "vazio") {
        aplicarFatos(vazio());
        setErroDados(r.mensagem ?? "Não foi possível carregar os dados do PostgreSQL.");
      } else {
        // fonte "local" só existe em DEV/preview; em produção nunca há mock.
        if (import.meta.env.DEV) setErroDados(null);
        else {
          aplicarFatos(vazio());
          setErroDados(r.mensagem ?? "Não foi possível carregar os dados do PostgreSQL.");
        }
      }
      setVersao((v) => v + 1);
    } catch {
      setFonte("indisponivel");
      // Nunca manter dados antigos nem cair para mock quando a consulta falha.
      aplicarFatos(vazio());
      setVersao((v) => v + 1);
      setErroDados("Não foi possível carregar os dados do PostgreSQL.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

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
      recarregar,
      carregando,
      erroDados,
      fonte,
    };
  }, [upload, filtros, setFiltro, limparFiltros, risco, versao, recarregar, carregando, erroDados, fonte]);

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export const useDataset = () => useContext(DatasetContext);
