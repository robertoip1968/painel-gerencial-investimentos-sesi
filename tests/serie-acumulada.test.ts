import { describe, expect, it } from "bun:test";
import type { Dataset } from "@/lib/csv-import";
import { aplicarConfigExercicio } from "@/lib/exercicio";
import { ritmos, serieAcumulada } from "@/lib/real-data";

function dataset(realizados: number[]): Dataset {
  const mensal = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    previsto: 2_000_000,
    realizado: realizados[i] ?? 0,
  }));

  return {
    fileName: "teste",
    linhas: mensal.length,
    previsto: mensal.reduce((total, mes) => total + mes.previsto, 0),
    realizado: mensal.reduce((total, mes) => total + mes.realizado, 0),
    mensal,
    segCentroCusto: [],
    segItem: [],
    segConta: [],
  };
}

describe("serieAcumulada com mês parcial", () => {
  aplicarConfigExercicio({ ano: 2026, mesFechado: 9 });

  it("exibe o realizado acumulado até OUT quando OUT possui realizado", () => {
    const d = dataset([...Array(9).fill(1_000_000), 400_000]);
    const serie = serieAcumulada(d);

    expect(serie[9]?.realizado).toBe(9.4);
    expect(serie[10]?.realizado).toBeNull();
  });

  it("mantém média e ritmo calculados somente até SET", () => {
    const d = dataset([...Array(9).fill(1_000_000), 400_000]);
    const ritmo = ritmos(d);
    const serie = serieAcumulada(d);

    expect(ritmo.base).toBe(9);
    expect(ritmo.media).toBe(1_000_000);
    expect(serie[9]?.forecast).toBe(10);
  });

  it("encerra o realizado acumulado em SET quando OUT não possui realizado", () => {
    const d = dataset(Array(9).fill(1_000_000));
    const serie = serieAcumulada(d);

    expect(serie[8]?.realizado).toBe(9);
    expect(serie[9]?.realizado).toBeNull();
  });
});