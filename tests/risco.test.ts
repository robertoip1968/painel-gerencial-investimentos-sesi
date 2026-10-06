import { describe, expect, it } from "bun:test";
import type { Dataset } from "@/lib/csv-import";
import { riscoResumo } from "@/lib/real-data";

function dataset(segCentroCusto: Dataset["segCentroCusto"]): Dataset {
  return {
    fileName: "teste",
    linhas: segCentroCusto.length,
    segCentroCusto,
    segItem: [],
    segConta: [],
    previsto: segCentroCusto.reduce((a, c) => a + c.previsto, 0),
    realizado: segCentroCusto.reduce((a, c) => a + c.realizado, 0),
    mensal: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, previsto: 0, realizado: 0 })),
  };
}

const comPrevisto = [
  { nome: "CC A", grupo: "G", previsto: 1_500_000, realizado: 0 }, // 0% < 60% da meta -> crítico
  { nome: "CC B", grupo: "G", previsto: 2_000_000, realizado: 2_000_000 }, // 100% -> em dia
];

const semPrevisto = { nome: "CC sem previsto", grupo: "G", previsto: 0, realizado: 500 };

describe("riscoResumo", () => {
  it("CC com previsto = 0 não entra em nenhuma faixa de risco", () => {
    const r = riscoResumo(dataset([comPrevisto[0]!, comPrevisto[1]!, semPrevisto]));
    const crit = r.find((x) => x.titulo === "Crítico")!;
    const ok = r.find((x) => x.titulo === "Em dia")!;
    const aten = r.find((x) => x.titulo === "Atenção")!;
    expect(crit.qtd).toBe(1);
    expect(ok.qtd).toBe(1);
    expect(aten.qtd).toBe(0);
  });

  it("CC com previsto = 0 não altera o valor crítico", () => {
    const semZero = riscoResumo(dataset(comPrevisto)).find((x) => x.titulo === "Crítico")!;
    const comZero = riscoResumo(dataset([...comPrevisto, semPrevisto])).find(
      (x) => x.titulo === "Crítico",
    )!;
    expect(comZero.qtd).toBe(semZero.qtd);
    expect(comZero.valor).toBe(semZero.valor);
  });

  it("mantém o critério existente para CC com previsto > 0", () => {
    const r = riscoResumo(dataset(comPrevisto));
    const crit = r.find((x) => x.titulo === "Crítico")!;
    expect(crit.qtd).toBe(1);
    expect(crit.valor).toBe("R$ 1,50 mi");
  });
});
