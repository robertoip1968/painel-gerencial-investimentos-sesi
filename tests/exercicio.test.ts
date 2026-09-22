import { describe, expect, it } from "bun:test";
import { escolherAno, mesFechadoPara } from "@/lib/exercicio";

const ANOS = [2026, 2025, 2024, 2023, 2022, 2021];

describe("escolherAno", () => {
  it("usa o ano solicitado quando ele existe na base", () => {
    expect(escolherAno(2023, ANOS, 2026)).toBe(2023);
  });

  it("cai no PAINEL_ANO_PADRAO quando nada foi solicitado", () => {
    expect(escolherAno(undefined, ANOS, 2026)).toBe(2026);
  });

  it("usa o maior ano disponível quando o padrão não existe na base", () => {
    expect(escolherAno(undefined, [2024, 2022], 2026)).toBe(2024);
  });

  it("ignora ano solicitado inexistente ou inválido", () => {
    expect(escolherAno(1999, ANOS, 2026)).toBe(2026);
    expect(escolherAno(2019, ANOS, 2026)).toBe(2026);
  });

  it("sem lista disponível mantém o solicitado válido ou o padrão", () => {
    expect(escolherAno(2025, [], 2026)).toBe(2025);
    expect(escolherAno(undefined, [], 2026)).toBe(2026);
  });
});

describe("mesFechadoPara", () => {
  it("considera exercícios anteriores totalmente encerrados", () => {
    expect(mesFechadoPara(2024, 2026, 7)).toBe(12);
  });

  it("preserva PAINEL_MES_FECHADO no exercício padrão", () => {
    expect(mesFechadoPara(2026, 2026, 7)).toBe(7);
  });
});
