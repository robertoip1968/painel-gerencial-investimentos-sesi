import { describe, expect, it } from "bun:test";
import { derivarCodItem, metabaseParaLinhas, origemDeContaNivel1 } from "@/lib/metabase-map";

const base = {
  CodEmpresa: "02MT",
  Ano: 2026,
  Mes: 3,
  Conta_Nivel1: "DESPESAS",
  CodCentroCusto: "13040107",
  CentroCusto: "SESI ESCOLA CUIABA",
  CodItem_Nivel4: "2630610",
  CodItem_Nivel5: "26306100101",
  CodItem: "30610010103",
  ItemContabil: "50 ANOS SESI - COOPERACAO SOCIAL",
  CodConta: "3204010101",
  Conta: "MATERIAL DE CONSUMO",
  SaldoOR: "1.234,56",
  SaldoRC: "-500,25",
};

describe("transformador Metabase", () => {
  it("deriva codItem e converte valores negativos", () => {
    const r = metabaseParaLinhas([base]);
    expect(r.rejeitadas).toEqual([]);
    const l = r.linhas[0]!;
    expect(l.codItem).toBe("2630610010103");
    expect(l.origem).toBe("DESPESA");
    expect(l.previsto).toBeCloseTo(1234.56);
    expect(l.realizado).toBeCloseTo(-500.25);
    expect(l.ano).toBe(2026);
    expect(l.mes).toBe(3);
    expect(l.codConta).toBe("3204010101");
  });

  it("mapeia RECEITAS e rejeita Conta_Nivel1 desconhecida", () => {
    expect(origemDeContaNivel1("RECEITAS")).toBe("RECEITA");
    expect(origemDeContaNivel1("OUTRO")).toBeNull();
    const r = metabaseParaLinhas([{ ...base, Conta_Nivel1: "OUTRO" }]);
    expect(r.linhas).toHaveLength(0);
    expect(r.rejeitadas[0]!.motivo).toContain("Conta_Nivel1");
  });

  it("rejeita item malformado em vez de gerar código incorreto", () => {
    expect(derivarCodItem("", "30610010103")).toBeNull();
    expect(derivarCodItem("26306100101", "3")).toBeNull();
    const r = metabaseParaLinhas([{ ...base, CodItem: "", CodItem_Nivel4: "" }]);
    expect(r.linhas).toHaveLength(0);
  });

  it("deriva nível 5 a partir do nível 4 quando CodItem_Nivel5 vem vazio", () => {
    expect(derivarCodItem("", "30412010201", "253041201")).toBe("2530412010201");
    const r = metabaseParaLinhas([
      {
        ...base,
        Ano: 2025,
        CodItem_Nivel5: "",
        CodItem_Nivel4: "253041201",
        CodItem: "30412010201",
        ItemContabil: "CURSOS EAD EM SAUDE",
      },
    ]);
    expect(r.rejeitadas).toEqual([]);
    expect(r.linhas[0]!.codItem).toBe("2530412010201");
  });

  it("não confunde o ramo 253 com o ramo 263", () => {
    expect(derivarCodItem("26304120102", "30412010201", "263041201")).toBe("2630412010201");
    expect(derivarCodItem("", "30412010201", "253041201")).toBe("2530412010201");
  });

  it("consolida desdobramentos por função-programa somando os saldos", () => {
    const r = metabaseParaLinhas([
      { ...base, SaldoOR: "100,00", SaldoRC: "10,00", CodFuncaoPrograma: "1" },
      { ...base, SaldoOR: "50,00", SaldoRC: "5,50", CodFuncaoPrograma: "2" },
      { ...base, SaldoOR: "25,00", SaldoRC: "-2,50", CodFuncaoPrograma: "3" },
    ]);
    expect(r.rejeitadas).toEqual([]);
    expect(r.total).toBe(3);
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0]!.previsto).toBeCloseTo(175);
    expect(r.linhas[0]!.realizado).toBeCloseTo(13);
  });

  it("conflito de nomes na mesma chave impede consolidação silenciosa", () => {
    const r = metabaseParaLinhas([
      { ...base, SaldoOR: "100,00" },
      { ...base, SaldoOR: "50,00", Conta: "OUTRA CONTA" },
    ]);
    expect(r.rejeitadas).toHaveLength(1);
    expect(r.rejeitadas[0]!.motivo).toContain("Conflito");
    expect(r.linhas[0]!.previsto).toBeCloseTo(100);
  });

  it("falha quando faltam colunas obrigatórias", () => {
    const { SaldoRC, ...semSaldo } = base;
    expect(() => metabaseParaLinhas([semSaldo])).toThrow(/SaldoRC/);
    const { CodItem_Nivel4, ...semNivel4 } = base;
    expect(() => metabaseParaLinhas([semNivel4])).toThrow(/CodItem_Nivel4/);
  });

  it("carga multi-ano não colide na chave oficial", () => {
    const r = metabaseParaLinhas([base, { ...base, Ano: 2025 }]);
    expect(r.anos).toEqual([2025, 2026]);
    expect(r.linhas).toHaveLength(2);
    const chaves = new Set(r.linhas.map(chaveOficial));
    expect(chaves.size).toBe(2);
  });
});
