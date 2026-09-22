import { createServerFn } from "@tanstack/react-start";
import type { FatosPayload } from "@/lib/facts";
import { anoValido, escolherAno, mesFechadoPara } from "@/lib/exercicio";

export type CargaFatosPainel = {
  fonte: "db" | "local" | "indisponivel" | "vazio";
  payload: FatosPayload | null;
  mensagem?: string;
  /** Configuração server-side do exercício (PAINEL_ANO_PADRAO / PAINEL_MES_FECHADO). */
  config: {
    ano: number;
    mesFechado: number;
    producao: boolean;
    /** Exercícios existentes no PostgreSQL, do mais recente ao mais antigo. */
    anosDisponiveis: number[];
  };
};

/**
 * Carrega os fatos da view dash_sesi.vw_fatos para UM exercício.
 * Em produção o Postgres é a fonte oficial: se estiver indisponível ou vazio,
 * devolve o estado de erro (nunca cai para os JSONs de demonstração).
 */
export const carregarFatos = createServerFn({ method: "GET" })
  .inputValidator((data: { ano?: number } | undefined) => ({
    ano: anoValido(data?.ano) ? data!.ano : undefined,
  }))
  .handler(async ({ data }): Promise<CargaFatosPainel> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { sessaoDaRequisicao } = await import("@/lib/auth.server");
    const {
      carregarFatosParaPainel,
      anoPadraoConfigurado,
      mesFechadoConfigurado,
      anosDisponiveisDoBanco,
    } = await import("@/lib/db.server");

    const anoPadrao = anoPadraoConfigurado();
    const mesFechadoPadrao = mesFechadoConfigurado();
    const producao = process.env["NODE_ENV"] === "production";

    const request = getRequest();
    if (!request || !sessaoDaRequisicao(request)) {
      return {
        fonte: "indisponivel",
        payload: null,
        mensagem: "Sessão expirada. Entre novamente para carregar os dados oficiais.",
        config: {
          ano: anoPadrao,
          mesFechado: mesFechadoPadrao,
          producao,
          anosDisponiveis: [],
        },
      };
    }

    const anosDisponiveis = await anosDisponiveisDoBanco();
    const ano = escolherAno(data?.ano, anosDisponiveis, anoPadrao);
    const config = {
      ano,
      mesFechado: mesFechadoPara(ano, anoPadrao, mesFechadoPadrao),
      producao,
      anosDisponiveis:
        anosDisponiveis.length > 0 ? anosDisponiveis : anoValido(ano) ? [ano] : [],
    };

    const r = await carregarFatosParaPainel(ano);
    return {
      fonte: r.fonte,
      payload: (r.payload as FatosPayload | null) ?? null,
      ...(r.mensagem ? { mensagem: r.mensagem } : {}),
      config,
    };
  });
