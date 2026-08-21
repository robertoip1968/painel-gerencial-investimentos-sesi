-- =============================================================
-- Painel Gerencial de Investimentos — SESI/MT
-- Script de criação do banco de dados (PostgreSQL 14+)
-- Uso:  psql "$DATABASE_URL" -f db/schema.sql
-- =============================================================

CREATE SCHEMA IF NOT EXISTS painel;
SET search_path TO painel, public;

-- -------------------------------------------------------------
-- Tabela principal (grão: exercício x mês x tipo x CC x item x conta)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS painel.lancamentos (
  id              bigserial PRIMARY KEY,
  ano             smallint     NOT NULL,
  mes             smallint     NOT NULL CHECK (mes BETWEEN 1 AND 12),
  tipo            text         NOT NULL CHECK (tipo IN ('DESPESA', 'RECEITA')),
  empresa         text         NOT NULL DEFAULT '02MT',
  centro_custo    text         NOT NULL,
  item_contabil   text         NOT NULL,
  conta_contabil  text         NOT NULL,
  previsto        numeric(18,2) NOT NULL DEFAULT 0,
  comprometido    numeric(18,2) NOT NULL DEFAULT 0,
  realizado       numeric(18,2) NOT NULL DEFAULT 0,
  fonte           text,                        -- nome do arquivo/carga de origem
  criado_em       timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_lanc_ano_tipo   ON painel.lancamentos (ano, tipo);
CREATE INDEX IF NOT EXISTS ix_lanc_mes        ON painel.lancamentos (ano, mes);
CREATE INDEX IF NOT EXISTS ix_lanc_cc         ON painel.lancamentos (centro_custo);
CREATE INDEX IF NOT EXISTS ix_lanc_item       ON painel.lancamentos (item_contabil);
CREATE INDEX IF NOT EXISTS ix_lanc_conta      ON painel.lancamentos (conta_contabil);

-- -------------------------------------------------------------
-- Tabela de staging para importar o CSV bruto (todas as colunas texto)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS painel.stg_csv (
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

-- Exemplo de carga (formato brasileiro de números: 1.234,56):
-- \copy painel.stg_csv FROM 'shift_2026_dados.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
--
-- INSERT INTO painel.lancamentos
--   (ano, mes, tipo, empresa, centro_custo, item_contabil, conta_contabil,
--    previsto, comprometido, realizado, fonte)
-- SELECT ano::smallint, mes::smallint, upper(tipo), coalesce(empresa,'02MT'),
--        centro_custo, item_contabil, conta_contabil,
--        replace(replace(coalesce(previsto,'0'),'.',''),',','.')::numeric,
--        replace(replace(coalesce(comprometido,'0'),'.',''),',','.')::numeric,
--        replace(replace(coalesce(realizado,'0'),'.',''),',','.')::numeric,
--        'shift_2026_dados.csv'
-- FROM painel.stg_csv;

-- -------------------------------------------------------------
-- Visão agregada consumida pelo painel (uma linha por combinação)
-- -------------------------------------------------------------
CREATE OR REPLACE VIEW painel.vw_fatos AS
SELECT
  ano,
  tipo,
  mes,
  centro_custo,
  item_contabil,
  conta_contabil,
  count(*)::int      AS linhas,
  sum(previsto)      AS previsto,
  sum(comprometido)  AS comprometido,
  sum(realizado)     AS realizado
FROM painel.lancamentos
GROUP BY ano, tipo, mes, centro_custo, item_contabil, conta_contabil;

-- Visão de KPIs do exercício (útil também para o fluxo N8N do assistente)
CREATE OR REPLACE VIEW painel.vw_kpis AS
SELECT
  ano,
  tipo,
  sum(previsto)                                        AS previsto,
  sum(comprometido)                                    AS comprometido,
  sum(realizado)                                       AS realizado,
  sum(previsto) - sum(realizado)                       AS saldo,
  CASE WHEN sum(previsto) > 0
       THEN round(100 * sum(realizado) / sum(previsto), 2)
       ELSE 0 END                                      AS execucao_pct,
  max(mes) FILTER (WHERE realizado > 0)                AS mes_base
FROM painel.lancamentos
GROUP BY ano, tipo;

-- -------------------------------------------------------------
-- Usuário somente leitura para a aplicação (ajuste a senha)
-- -------------------------------------------------------------
-- CREATE ROLE painel_app LOGIN PASSWORD 'troque-esta-senha';
-- GRANT USAGE ON SCHEMA painel TO painel_app;
-- GRANT SELECT ON ALL TABLES IN SCHEMA painel TO painel_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA painel GRANT SELECT ON TABLES TO painel_app;
