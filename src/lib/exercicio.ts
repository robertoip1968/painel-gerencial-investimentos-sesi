/**
 * Configuração do exercício analisado (ano e último mês fechado).
 *
 * Os valores oficiais vêm do backend (PAINEL_ANO_PADRAO / PAINEL_MES_FECHADO)
 * e são aplicados em memória quando o painel carrega os fatos do PostgreSQL.
 * Nada aqui usa prefixo VITE_ — o navegador só recebe o que o servidor enviar.
 */

export type ConfigExercicio = {
  ano: number;
  /** 0 = não configurado; 1..12 = último mês encerrado. */
  mesFechado: number;
};

const cfg: ConfigExercicio = { ano: new Date().getFullYear(), mesFechado: 0 };

export function aplicarConfigExercicio(c: Partial<ConfigExercicio>) {
  if (c.ano && c.ano >= 2000 && c.ano <= 2100) cfg.ano = c.ano;
  if (typeof c.mesFechado === "number" && c.mesFechado >= 0 && c.mesFechado <= 12)
    cfg.mesFechado = Math.trunc(c.mesFechado);
}

/** Exercício (ano) usado nas consultas e nos títulos do painel. */
export const anoExercicio = () => cfg.ano;

/** Último mês encerrado configurado (0 quando não há configuração). */
export const mesFechadoConfig = () => cfg.mesFechado;

/** Mês corrente/parcial (o seguinte ao último fechado), ou 0. */
export const mesParcial = () =>
  cfg.mesFechado > 0 && cfg.mesFechado < 12 ? cfg.mesFechado + 1 : 0;
