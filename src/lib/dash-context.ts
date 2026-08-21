import type { Dataset } from "@/lib/csv-import";
import type { Filtros } from "@/lib/facts";
import { TODOS } from "@/lib/facts";
import {
  ANO,
  MESES,
  forecastAno,
  mesBase,
  mesFechadoConfig,
  mesParcial,
  mesUltimoDado,
  realizadoFechado,
  ritmos,
} from "@/lib/real-data";

const n2 = (v: number) => (v / 1_000_000).toFixed(2);
const pc = (v: number, b: number) => (b > 0 ? ((v / b) * 100).toFixed(1) : "0,0");

/** Resumo compacto (texto) do recorte atual do painel, enviado ao assistente. */
export function contextoDoPainel(
  d: Dataset,
  filtros: Filtros,
  receita: { previsto: number; realizado: number; linhas: number },
) {
  const mb = mesBase(d);
  const mUlt = mesUltimoDado(d);
  const parcial = mesParcial();
  const temConfig = mesFechadoConfig() >= 1;
  const futuros = parcial > 0 && parcial < 12 ? `${MESES[parcial]}–${MESES[11]}` : "nenhum";
  const linhaTemporal = temConfig
    ? `CALENDÁRIO OFICIAL: último mês fechado: ${MESES[mb - 1]} (${mb}); mês atual/parcial: ${
        parcial > 0 ? MESES[parcial - 1] : "nenhum"
      }; meses futuros: ${futuros}. Meses parciais e futuros NÃO são meses encerrados e não indicam falha de execução.`
    : `CALENDÁRIO: último mês com execução registrada: ${MESES[mb - 1]} (${mb}).`;
  const { media, necessario, restantes } = ritmos(d);
  const fc = forecastAno(d);
  const saldo = d.previsto - d.realizado;
  const meta = (mb / 12) * 100;

  const seg = (rows: Dataset["segCentroCusto"], n: number) =>
    [...rows]
      .sort((a, b) => b.previsto - a.previsto)
      .slice(0, n)
      .map(
        (r) =>
          `- ${r.nome} (${r.grupo}): previsto R$ ${n2(r.previsto)} mi | realizado R$ ${n2(
            r.realizado,
          )} mi | exec ${pc(r.realizado, r.previsto)}% | saldo R$ ${n2(r.previsto - r.realizado)} mi`,
      )
      .join("\n");

  const mensal = (d.mensal ?? [])
    .map((m) => `${MESES[m.mes - 1]}: prev R$ ${n2(m.previsto)} mi / real R$ ${n2(m.realizado)} mi`)
    .join("; ");

  const criticos = d.segCentroCusto.filter(
    (c) => c.previsto > 0 && (c.realizado / c.previsto) * 100 < meta * 0.6,
  );
  const semExec = d.segItem.filter((i) => i.previsto > 0 && i.realizado === 0);

  const f = [
    `período: ${MESES[filtros.mesIni - 1]}–${MESES[filtros.mesFim - 1]}`,
    `centro de custo: ${filtros.cc === TODOS ? "todos" : filtros.cc}`,
    `item contábil: ${filtros.item === TODOS ? "todos" : filtros.item}`,
    `conta contábil: ${filtros.conta === TODOS ? "todos" : filtros.conta}`,
  ].join(" | ");

  return `BASE: ${d.fileName} — exercício ${ANO()} (valores em reais; aqui resumidos em R$ milhões).
${linhaTemporal}
FILTROS ATIVOS: ${f}
LANÇAMENTOS NO RECORTE: ${d.linhas.toLocaleString("pt-BR")}

DESPESA (recorte atual)
- Previsto: R$ ${n2(d.previsto)} mi
- Realizado (inclui o mês parcial, quando houver): R$ ${n2(d.realizado)} mi (${pc(d.realizado, d.previsto)}% do previsto)
- Saldo a executar: R$ ${n2(saldo)} mi
- Comprometido: não disponível na base oficial (não use esse conceito na resposta)
- Período dos dados: ${MESES[0]}–${MESES[mUlt - 1]}/${ANO()}
- Último mês fechado: ${MESES[mb - 1]}/${ANO()} (mês ${mb}); meta linear do período: ${meta.toFixed(1)}%
- ${parcial > 0 && mUlt >= parcial ? `${MESES[parcial - 1]}/${ANO()}: parcial (tem realizado, mas o mês ainda não encerrou)` : "Não há mês parcial com execução registrada"}
- Meses sem dados (futuros): ${mUlt < 12 ? `${MESES[mUlt]}–${MESES[11]}` : "nenhum"}

- Realizado nos meses FECHADOS (${MESES[0]}–${MESES[mb - 1]}): R$ ${n2(realizadoFechado(d))} mi
- Ritmo médio realizado (somente meses fechados): R$ ${n2(media)} mi/mês
- Ritmo necessário para executar 100%: R$ ${n2(necessario)} mi/mês em ${restantes} meses
- Forecast anual (baseado apenas nos meses fechados ${MESES[0]}–${MESES[mb - 1]}, ritmo x 12): R$ ${n2(fc)} mi (${pc(fc, d.previsto)}% do previsto)
- Desvio projetado no fim do ano (forecast - previsto): R$ ${n2(fc - d.previsto)} mi

RECEITA (mesmo recorte)
- Prevista: R$ ${n2(receita.previsto)} mi | Realizada: R$ ${n2(receita.realizado)} mi (${pc(
    receita.realizado,
    receita.previsto,
  )}%)
- Resultado previsto (receita - despesa): R$ ${n2(receita.previsto - d.previsto)} mi
- Resultado realizado até ${MESES[mUlt - 1]}: R$ ${n2(receita.realizado - d.realizado)} mi

EXECUÇÃO MENSAL (não acumulada): ${mensal}

RISCO: ${criticos.length} centros de custo críticos (exec < ${(meta * 0.6).toFixed(
    0,
  )}% da meta linear), somando R$ ${n2(
    criticos.reduce((a, c) => a + c.previsto, 0),
  )} mi previstos. ${semExec.length} itens contábeis sem nenhuma execução (R$ ${n2(
    semExec.reduce((a, i) => a + i.previsto, 0),
  )} mi).

TOP CENTROS DE CUSTO
${seg(d.segCentroCusto, 15)}

TOP ITENS CONTÁBEIS
${seg(d.segItem, 15)}

TOP CONTAS CONTÁBEIS
${seg(d.segConta, 15)}`;
}
