import { createServerFn } from "@tanstack/react-start";
import type { FatosPayload } from "@/lib/facts";
import { FATOS_ANO } from "@/lib/facts";

/**
 * Carrega os fatos do Postgres (view painel.vw_fatos) no mesmo formato
 * do JSON embarcado. Retorna null quando o banco não está configurado
 * ou indisponível — nesse caso o painel usa os dados locais.
 */
export const carregarFatos = createServerFn({ method: "GET" }).handler(
  async (): Promise<FatosPayload | null> => {
    try {
      const { lerFatosDoBanco } = await import("@/lib/db.server");
      const rows = await lerFatosDoBanco(FATOS_ANO);
      if (!rows || rows.length === 0) return null;

      const cc: string[] = [];
      const item: string[] = [];
      const conta: string[] = [];
      const idx = (list: string[], v: string) => {
        const i = list.indexOf(v);
        if (i >= 0) return i;
        list.push(v);
        return list.length - 1;
      };
      const bloco = () => ({
        n: 0,
        mes: [] as number[],
        cc: [] as number[],
        item: [] as number[],
        conta: [] as number[],
        linhas: [] as number[],
        previsto: [] as number[],
        realizado: [] as number[],
      });
      const despesa = bloco();
      const receita = bloco();

      for (const r of rows) {
        const b = r.tipo === "RECEITA" ? receita : despesa;
        b.mes.push(r.mes);
        b.cc.push(idx(cc, r.centro_custo));
        b.item.push(idx(item, r.item_contabil));
        b.conta.push(idx(conta, r.conta_contabil));
        b.linhas.push(r.linhas);
        b.previsto.push(r.previsto);
        b.realizado.push(r.realizado);
        b.n += 1;
      }

      return {
        ano: FATOS_ANO,
        empresa: "02MT",
        fileName: "Banco de dados Postgres",
        cc,
        item,
        conta,
        despesa,
        receita,
      };
    } catch (e) {
      console.error("Falha ao ler fatos do Postgres:", e);
      return null;
    }
  },
);
