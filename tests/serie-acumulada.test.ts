import { describe, expect, it } from "bun:test";
import type { Dataset } from "@/lib/csv-import";
import { aplicarConfigExercicio, mesCobertoPara } from "@/lib/exercicio";
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
  aplicarConfigExercicio({ ano: 2026, mesFechado: 9, mesCoberto: 0 });

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
describe("serieAcumulada limitada pela última importação", () => {
  const nove = [433579.66, 3807611.44, 1602561.45, 1593126.06, 2440602.42, 2335578.27, 3612562.93, 3336548.51, 3608921.02];
  const somaSet = nove.reduce((a, b) => a + b, 0);

  it("importação em OUT + OUT realizado 0 => OUT = acumulado de SET e NOV null", () => {
    aplicarConfigExercicio({ ano: 2026, mesFechado: 9, mesCoberto: 10 });
    const serie = serieAcumulada(dataset([...nove, 0, 0, 0]));
    expect(serie[8]?.realizado).toBeCloseTo(somaSet / 1e6, 9);
    expect(serie[9]?.realizado).toBeCloseTo(somaSet / 1e6, 9);
    expect(serie[10]?.realizado).toBeNull();
    expect(serie[11]?.realizado).toBeNull();
  });

  it("importação em OUT + OUT com realizado > 0 => soma OUT e NOV null", () => {
    aplicarConfigExercicio({ ano: 2026, mesFechado: 9, mesCoberto: 10 });
    const serie = serieAcumulada(dataset([...nove, 500_000]));
    expect(serie[9]?.realizado).toBeCloseTo((somaSet + 500_000) / 1e6, 9);
    expect(serie[10]?.realizado).toBeNull();
  });

  it("histórico => realizado vai até DEZ", () => {
    expect(mesCobertoPara(2024, 2026, { ano: 2026, mes: 10 })).toBe(12);
    expect(mesCobertoPara(2026, 2026, { ano: 2026, mes: 10 })).toBe(10);
    aplicarConfigExercicio({ ano: 2024, mesFechado: 12, mesCoberto: 12 });
    const serie = serieAcumulada(dataset([...Array(10).fill(1_000_000), 0, 0]));
    expect(serie[11]?.realizado).toBe(10);
  });

  it("média/ritmo usam apenas PAINEL_MES_FECHADO", () => {
    aplicarConfigExercicio({ ano: 2026, mesFechado: 9, mesCoberto: 10 });
    const r = ritmos(dataset([...Array(9).fill(1_000_000), 5_000_000]));
    expect(r.base).toBe(9);
    expect(r.media).toBe(1_000_000);
    aplicarConfigExercicio({ mesCoberto: 0 });
  });
});
