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
  type FatosPayload,
  filtrosAtivos,
} from "@/lib/facts";
import { carregarFatos } from "@/lib/fatos.functions";
import { anoExercicio, aplicarConfigExercicio } from "@/lib/exercicio";

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
  /** Exercício exibido no painel. */
  anoSelecionado: number;
  /** Exercícios existentes na base (DESC). */
  anosDisponiveis: number[];
  /** Troca de exercício: recarrega os fatos e limpa filtros do ano anterior. */
  setAnoSelecionado: (ano: number) => void;
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
  aplicarLocais: () => {},
  carregando: false,
  erroDados: null,
  fonte: "local",
  anoSelecionado: anoExercicio(),
  anosDisponiveis: [],
  setAnoSelecionado: () => {},
});

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [upload, setUpload] = useState<Dataset | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(filtrosPadrao);
  const [risco, setRisco] = useState<RiscoFiltro>(null);
  const [versao, setVersao] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erroDados, setErroDados] = useState<string | null>(null);
  const [fonte, setFonte] = useState<Ctx["fonte"]>("local");
  const [anoSelecionado, setAno] = useState<number>(() => anoExercicio());
  const [anosDisponiveis, setAnosDisponiveis] = useState<number[]>([]);

  const carregarAno = useCallback(async (ano?: number) => {
    setCarregando(true);
    try {
      const r = await carregarFatos(ano ? { data: { ano } } : undefined);
      if (r.config) {
        aplicarConfigExercicio(r.config);
        setAno(r.config.ano);
        setAnosDisponiveis(r.config.anosDisponiveis ?? []);
      }
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

  /** Recarrega o exercício atualmente selecionado (usado após importação). */
  const recarregar = useCallback(() => carregarAno(anoSelecionado), [carregarAno, anoSelecionado]);

  const setAnoSelecionado = useCallback(
    (ano: number) => {
      if (ano === anoSelecionado) return;
      setAno(ano);
      // filtros do exercício anterior não valem para o novo ano
      setFiltros(filtrosPadrao);
      setRisco(null);
      setUpload(null);
      void carregarAno(ano);
    },
    [anoSelecionado, carregarAno],
  );

  useEffect(() => {
    void carregarAno();
    // carga inicial: o servidor decide o exercício padrão
     
  }, [carregarAno]);

  const aplicarLocais = useCallback((p: FatosPayload) => {
    aplicarFatos(p);
    setFonte("local");
    setErroDados(null);
    setVersao((v) => v + 1);
  }, []);

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
      aplicarLocais,
      carregando,
      erroDados,
      fonte,
      anoSelecionado,
      anosDisponiveis,
      setAnoSelecionado,
    };
  }, [upload, filtros, setFiltro, limparFiltros, risco, versao, recarregar, aplicarLocais, carregando, erroDados, fonte, anoSelecionado, anosDisponiveis, setAnoSelecionado]);

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export const useDataset = () => useContext(DatasetContext);
