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
-- Tabela principal — grão oficial da planilha SHIFT:
-- origem + cod_empresa + ano + mes + centro de custo + item + conta
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dash_sesi.lancamentos (
  id                  bigserial PRIMARY KEY,
  origem              text          NOT NULL CHECK (origem IN ('DESPESA', 'RECEITA')),
  cod_empresa         text          NOT NULL DEFAULT '02MT',
  ano                 smallint      NOT NULL,
  mes                 smallint      NOT NULL CHECK (mes BETWEEN 1 AND 12),
  cod_centro_custo    text,
  nome_centro_custo   text          NOT NULL,
  cod_item_contabil   text,
  nome_item_contabil  text          NOT NULL,
  cod_conta_contabil  text,
  nome_conta_contabil text          NOT NULL,
  previsto            numeric(18,2) NOT NULL DEFAULT 0,   -- aceita valores negativos
  realizado           numeric(18,2) NOT NULL DEFAULT 0,   -- aceita valores negativos (estornos)
  fonte               text,                               -- nome do arquivo de origem
  importacao_id       bigint,
  criado_em           timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE dash_sesi.lancamentos IS 'Lançamentos consolidados do Painel Gerencial de Investimentos (grão da planilha SHIFT). Não há coluna "comprometido" na fonte oficial.';

CREATE INDEX IF NOT EXISTS ix_lanc_ano_origem ON dash_sesi.lancamentos (ano, origem);
CREATE INDEX IF NOT EXISTS ix_lanc_mes        ON dash_sesi.lancamentos (ano, mes);
CREATE INDEX IF NOT EXISTS ix_lanc_cc         ON dash_sesi.lancamentos (nome_centro_custo);
CREATE INDEX IF NOT EXISTS ix_lanc_item       ON dash_sesi.lancamentos (nome_item_contabil);
CREATE INDEX IF NOT EXISTS ix_lanc_conta      ON dash_sesi.lancamentos (nome_conta_contabil);

-- Proteção do grão oficial: uma linha por
-- origem + empresa + ano + mês + centro de custo + item + conta.
-- coalesce garante unicidade mesmo quando o código vem vazio/nulo.
CREATE UNIQUE INDEX IF NOT EXISTS ux_lanc_grao ON dash_sesi.lancamentos (
  origem,
  cod_empresa,
  ano,
  mes,
  coalesce(cod_centro_custo, ''),
  coalesce(cod_item_contabil, ''),
  coalesce(cod_conta_contabil, '')
);


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
  importacao_id       bigint,
  linha_origem        integer,
  origem              text,
  cod_empresa         text,
  ano                 text,
  mes                 text,
  cod_centro_custo    text,
  nome_centro_custo   text,
  cod_item_contabil   text,
  nome_item_contabil  text,
  cod_conta_contabil  text,
  nome_conta_contabil text,
  previsto            text,
  realizado           text
);

COMMENT ON TABLE dash_sesi.fin_shift_staging IS 'Staging bruto das cargas SHIFT antes da promoção para dash_sesi.lancamentos.';

CREATE INDEX IF NOT EXISTS ix_stg_importacao ON dash_sesi.fin_shift_staging (importacao_id);

-- -------------------------------------------------------------
-- Visão agregada consumida pelo painel (uma linha por combinação)
-- -------------------------------------------------------------
-- A view preserva códigos E nomes: registros com códigos diferentes nunca são
-- agrupados apenas por terem o mesmo nome. (DROP + CREATE porque a lista de
-- colunas mudou; CREATE OR REPLACE não permite acrescentar colunas.)
DROP VIEW IF EXISTS dash_sesi.vw_fatos;
CREATE VIEW dash_sesi.vw_fatos AS
SELECT
  ano,
  origem            AS tipo,
  mes,
  cod_centro_custo,
  nome_centro_custo   AS centro_custo,
  cod_item_contabil,
  nome_item_contabil  AS item_contabil,
  cod_conta_contabil,
  nome_conta_contabil AS conta_contabil,
  count(*)::int     AS linhas,
  sum(previsto)     AS previsto,
  sum(realizado)    AS realizado
FROM dash_sesi.lancamentos
GROUP BY ano, origem, mes,
         cod_centro_custo, nome_centro_custo,
         cod_item_contabil, nome_item_contabil,
         cod_conta_contabil, nome_conta_contabil;

COMMENT ON VIEW dash_sesi.vw_fatos IS 'Fatos agregados usados por KPIs, gráficos, filtros e tabelas do painel.';

-- Visão de KPIs do exercício (também usada pelo fluxo n8n do assistente)
CREATE OR REPLACE VIEW dash_sesi.vw_kpis AS
SELECT
  ano,
  origem                                AS tipo,
  sum(previsto)                         AS previsto,
  sum(realizado)                        AS realizado,
  sum(previsto) - sum(realizado)        AS saldo,
  CASE WHEN sum(previsto) <> 0
       THEN round(100 * sum(realizado) / sum(previsto), 2)
       ELSE 0 END                       AS execucao_pct,
  max(mes) FILTER (WHERE realizado <> 0) AS mes_base
FROM dash_sesi.lancamentos
GROUP BY ano, origem;

COMMENT ON VIEW dash_sesi.vw_kpis IS 'KPIs consolidados do exercício por origem (DESPESA/RECEITA).';

