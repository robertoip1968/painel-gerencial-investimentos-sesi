-- =============================================================
-- Painel Gerencial de Investimentos — SESI/MT
-- Banco: sesi_investimentos   |   Schema: dash_sesi
-- PostgreSQL 17 — script idempotente
-- Uso:  psql "$DATABASE_URL" -f db/schema.sql
-- Obs.: roles/usuários (painel_app, n8n_agent) são geridos pela
--       infraestrutura e NÃO são criados aqui.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS dash_sesi;
SET search_path TO dash_sesi, public;

-- -------------------------------------------------------------
-- Tabela principal (grão: exercício x mês x tipo x CC x item x conta)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dash_sesi.lancamentos (
  id              bigserial PRIMARY KEY,
  ano             smallint      NOT NULL,
  mes             smallint      NOT NULL CHECK (mes BETWEEN 1 AND 12),
  tipo            text          NOT NULL CHECK (tipo IN ('DESPESA', 'RECEITA')),
  empresa         text          NOT NULL DEFAULT '02MT',
  centro_custo    text          NOT NULL,
  item_contabil   text          NOT NULL,
  conta_contabil  text          NOT NULL,
  previsto        numeric(18,2) NOT NULL DEFAULT 0,
  comprometido    numeric(18,2) NOT NULL DEFAULT 0,
  realizado       numeric(18,2) NOT NULL DEFAULT 0,
  fonte           text,                       -- nome do arquivo de origem
  importacao_id   bigint,                     -- referência à carga
  criado_em       timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE dash_sesi.lancamentos IS 'Lançamentos consolidados do Painel Gerencial de Investimentos (dash_sesi).';

CREATE INDEX IF NOT EXISTS ix_lanc_ano_tipo ON dash_sesi.lancamentos (ano, tipo);
CREATE INDEX IF NOT EXISTS ix_lanc_mes      ON dash_sesi.lancamentos (ano, mes);
CREATE INDEX IF NOT EXISTS ix_lanc_cc       ON dash_sesi.lancamentos (centro_custo);
CREATE INDEX IF NOT EXISTS ix_lanc_item     ON dash_sesi.lancamentos (item_contabil);
CREATE INDEX IF NOT EXISTS ix_lanc_conta    ON dash_sesi.lancamentos (conta_contabil);

-- -------------------------------------------------------------
-- Log de importações
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dash_sesi.importacoes (
  id                   bigserial PRIMARY KEY,
  nome_arquivo         text        NOT NULL,
  data_importacao      timestamptz NOT NULL DEFAULT now(),
  usuario              text,
  ano                  smallint,
  quantidade_linhas    integer     NOT NULL DEFAULT 0,
  quantidade_importada integer     NOT NULL DEFAULT 0,
  quantidade_rejeitada integer     NOT NULL DEFAULT 0,
  status               text        NOT NULL DEFAULT 'PENDENTE'
                       CHECK (status IN ('PENDENTE', 'SUCESSO', 'ERRO')),
  mensagem_erro        text
);

COMMENT ON TABLE dash_sesi.importacoes IS 'Histórico de importações de planilhas (Excel/CSV) feitas pelo painel.';

CREATE INDEX IF NOT EXISTS ix_importacoes_data ON dash_sesi.importacoes (data_importacao DESC);

-- -------------------------------------------------------------
-- Staging das importações (tudo texto, higienizado depois)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dash_sesi.fin_shift_staging (
  importacao_id   bigint,
  linha_origem    integer,
  ano             text,
  mes             text,
  tipo            text,
  empresa         text,
  centro_custo    text,
  item_contabil   text,
  conta_contabil  text,
  previsto        text,
  comprometido    text,
  realizado       text
);

COMMENT ON TABLE dash_sesi.fin_shift_staging IS 'Staging bruto das cargas SHIFT antes da promoção para dash_sesi.lancamentos.';

CREATE INDEX IF NOT EXISTS ix_stg_importacao ON dash_sesi.fin_shift_staging (importacao_id);

-- -------------------------------------------------------------
-- Visão agregada consumida pelo painel (uma linha por combinação)
-- -------------------------------------------------------------
CREATE OR REPLACE VIEW dash_sesi.vw_fatos AS
SELECT
  ano,
  tipo,
  mes,
  centro_custo,
  item_contabil,
  conta_contabil,
  count(*)::int     AS linhas,
  sum(previsto)     AS previsto,
  sum(comprometido) AS comprometido,
  sum(realizado)    AS realizado
FROM dash_sesi.lancamentos
GROUP BY ano, tipo, mes, centro_custo, item_contabil, conta_contabil;

COMMENT ON VIEW dash_sesi.vw_fatos IS 'Fatos agregados usados por KPIs, gráficos, filtros e tabelas do painel.';

-- Visão de KPIs do exercício (também usada pelo fluxo n8n do assistente)
CREATE OR REPLACE VIEW dash_sesi.vw_kpis AS
SELECT
  ano,
  tipo,
  sum(previsto)                         AS previsto,
  sum(comprometido)                     AS comprometido,
  sum(realizado)                        AS realizado,
  sum(previsto) - sum(realizado)        AS saldo,
  CASE WHEN sum(previsto) > 0
       THEN round(100 * sum(realizado) / sum(previsto), 2)
       ELSE 0 END                       AS execucao_pct,
  max(mes) FILTER (WHERE realizado > 0) AS mes_base
FROM dash_sesi.lancamentos
GROUP BY ano, tipo;

COMMENT ON VIEW dash_sesi.vw_kpis IS 'KPIs consolidados do exercício por tipo (DESPESA/RECEITA).';
