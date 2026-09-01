/**
 * Áreas — agrupamento gerencial de centros de custo.
 *
 * A fonte oficial (planilha SHIFT / dash_sesi.lancamentos) não traz a área;
 * ela é um "de-para" mantido por código de centro de custo. No banco isso vive
 * em dash_sesi.areas_centro_custo (ver db/schema.sql) e é exposto em
 * dash_sesi.vw_fatos.area. Este mapa é o espelho da mesma tabela para o
 * ambiente de demonstração/preview.
 */

export const AREA_OUTRAS = "NÃO CLASSIFICADO";

export const AREAS = [
  "EDUCAÇÃO",
  "SAÚDE",
  "ALIMENTAÇÃO",
  "SUPORTE",
  "CORPORATIVO",
  AREA_OUTRAS,
] as const;

export type Area = (typeof AREAS)[number];

/** Cor (token do design system) por área. */
export const CORES_AREA: Record<string, string> = {
  "EDUCAÇÃO": "var(--chart-1)",
  "SAÚDE": "var(--ok)",
  "ALIMENTAÇÃO": "var(--warn)",
  "SUPORTE": "var(--crit)",
  "CORPORATIVO": "var(--chart-4)",
  [AREA_OUTRAS]: "var(--muted-foreground)",
};

const MAPA: Record<string, Area> = {};
const registrar = (area: Area, codigos: string[]) => {
  for (const c of codigos) MAPA[c.trim()] = area;
};

registrar("EDUCAÇÃO", ["13040107", "13040115", "13040116", "1301120201", "13040114"]);
registrar("SAÚDE", ["1301120202", "13040113", "13040117", "13040112", "13040106", "13040109"]);
registrar("ALIMENTAÇÃO", [
  "13040119", "13040120", "13040121", "13040122", "13040123", "13040125",
  "13040126", "13040127", "13040128", "13040101", "1301120211", "13040124",
  "13040130", "13040129",
]);
registrar("SUPORTE", [
  "1301120104", "1301120216", "1301120210", "1301120208", "1301120213", "1301120102",
]);
registrar("CORPORATIVO", [
  "13050407", "13050403", "13050402", "13050304", "13050404", "13050310",
  "13050405", "13050401", "13050303", "13050202", "13050307", "13050301",
  "13050302", "13050406",
  // governança/gabinete e desenvolvimento corporativo
  "1301120214", "1301120101", "1301120103", "13020101", "13050201", "13050300",
]);

/** Extrai o código de um rótulo "codigo — nome". */
export function codigoDoRotulo(rotulo: string): string {
  const i = rotulo.indexOf("—");
  return (i > 0 ? rotulo.slice(0, i) : rotulo).trim();
}

/** Área de um centro de custo a partir do rótulo exibido no painel. */
export function areaDoCentroCusto(rotulo: string): Area {
  return MAPA[codigoDoRotulo(rotulo)] ?? AREA_OUTRAS;
}
