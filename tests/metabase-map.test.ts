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
    const r = metabaseParaLinhas([{ ...base, CodItem: "" }]);
    expect(r.linhas).toHaveLength(0);
  });

  it("falha quando faltam colunas obrigatórias", () => {
    const { SaldoRC, ...semSaldo } = base;
    expect(() => metabaseParaLinhas([semSaldo])).toThrow(/SaldoRC/);
  });

  it("carga multi-ano não colide na chave oficial", () => {
    const r = metabaseParaLinhas([base, { ...base, Ano: 2025 }]);
    expect(r.anos).toEqual([2025, 2026]);
    const chaves = new Set(
      r.linhas.map(
        (l) =>
          `${l.origem}|${l.codEmpresa}|${l.ano}|${l.mes}|${l.codCentroCusto}|${l.codItem}|${l.codConta}`,
      ),
    );
    expect(chaves.size).toBe(2);
  });
});
