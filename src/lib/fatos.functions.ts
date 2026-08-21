import { createServerFn } from "@tanstack/react-start";
import type { FatosPayload } from "@/lib/facts";

export type CargaFatosPainel = {
  fonte: "db" | "local" | "indisponivel" | "vazio";
  payload: FatosPayload | null;
  mensagem?: string;
  /** Configuração server-side do exercício (PAINEL_ANO_PADRAO / PAINEL_MES_FECHADO). */
  config: { ano: number; mesFechado: number; producao: boolean };
};

/**
 * Carrega os fatos da view dash_sesi.vw_fatos. Em produção o Postgres é a
 * fonte oficial: se estiver indisponível ou vazio, devolve o estado de erro
 * (o painel não cai silenciosamente para os JSONs de demonstração).
 */
export const carregarFatos = createServerFn({ method: "GET" }).handler(
  async (): Promise<CargaFatosPainel> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { sessaoDaRequisicao } = await import("@/lib/auth.server");
    const {
      carregarFatosParaPainel,
      anoPadraoConfigurado,
      mesFechadoConfigurado,
    } = await import("@/lib/db.server");

    const config = {
      ano: anoPadraoConfigurado(),
      mesFechado: mesFechadoConfigurado(),
      producao: process.env["NODE_ENV"] === "production",
    };

    const request = getRequest();
    if (!request || !sessaoDaRequisicao(request)) {
      return {
        fonte: "indisponivel",
        payload: null,
        mensagem: "Sessão expirada. Entre novamente para carregar os dados oficiais.",
        config,
      };
    }

    const r = await carregarFatosParaPainel(config.ano);
    return {
      fonte: r.fonte,
      payload: (r.payload as FatosPayload | null) ?? null,
      ...(r.mensagem ? { mensagem: r.mensagem } : {}),
      config,
    };
  },
);
