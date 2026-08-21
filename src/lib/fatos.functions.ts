import { createServerFn } from "@tanstack/react-start";
import type { FatosPayload } from "@/lib/facts";
import { FATOS_ANO } from "@/lib/facts";

export type CargaFatosPainel = {
  fonte: "db" | "local" | "indisponivel" | "vazio";
  payload: FatosPayload | null;
  mensagem?: string;
};

/**
 * Carrega os fatos da view dash_sesi.vw_fatos. Em produção o Postgres é a
 * fonte oficial: se estiver indisponível ou vazio, devolve o estado de erro
 * (o painel não cai silenciosamente para os JSONs de demonstração).
 */
export const carregarFatos = createServerFn({ method: "GET" }).handler(
  async (): Promise<CargaFatosPainel> => {
    const { carregarFatosParaPainel } = await import("@/lib/db.server");
    const r = await carregarFatosParaPainel(FATOS_ANO);
    return {
      fonte: r.fonte,
      payload: (r.payload as FatosPayload | null) ?? null,
      ...(r.mensagem ? { mensagem: r.mensagem } : {}),
    };
  },
);
