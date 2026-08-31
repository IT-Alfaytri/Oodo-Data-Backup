-- ============================================================
-- Financial Reports RPC v2 — adds period + as-of date filters.
--
-- p_date_from / p_date_to bound the reporting window on invoice_lines.date
-- (the accounting/ledger date; type date, 0 nulls among posted rows,
-- range 2021-03-08 .. 2026-08-30).
--
-- Accounting semantics:
--   * Profit & Loss + Trial Balance = PERIOD view  [from, to]
--       Income/Expense are flows; a complete set of balanced journal
--       entries within any window keeps total debit = total credit, so the
--       trial balance always foots.
--   * Balance Sheet                 = AS-OF view    (date <= to)
--       Assets/Liabilities/Equity are snapshots that carry forward, so they
--       ignore `from` and accumulate through the as-of date. A date<=to
--       truncation of complete entries always balances.
--   * bs_result = cumulative net (income - expense) through `to`, used as the
--       Balance Sheet's "current-year result" so Assets = Liab + Equity +
--       Result holds exactly. When p_date_from IS NULL, bs_result == net,
--       so the no-date and company-only calls behave exactly as before.
--
-- Both the no-arg and the (text) single-arg versions are dropped first so the
-- new 3-arg (all-defaulted) signature can't create an ambiguous overload with
-- a named-argument call like get_financial_reports(p_company := '...').
-- ============================================================

DROP FUNCTION IF EXISTS get_financial_reports();
DROP FUNCTION IF EXISTS get_financial_reports(text);

CREATE OR REPLACE FUNCTION get_financial_reports(
  p_company   text DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to   date DEFAULT NULL
)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH coa AS (
  SELECT DISTINCT code, account_type
  FROM chart_of_accounts
  WHERE code IS NOT NULL AND account_type IS NOT NULL
),
coa_named AS (
  SELECT code, min(name) AS name FROM chart_of_accounts WHERE code IS NOT NULL GROUP BY code
),
-- One scan of the ledger (company-filtered); referenced twice below, so the
-- planner materializes it once.
bucketed AS (
  SELECT split_part(il.account_id, ' ', 1) AS code,
         il.date,
         COALESCE(il.debit, 0)  AS debit,
         COALESCE(il.credit, 0) AS credit,
         COALESCE(il.balance, COALESCE(il.debit,0) - COALESCE(il.credit,0)) AS balance
  FROM invoice_lines il
  WHERE il.parent_state = 'posted'
    AND il.account_id IS NOT NULL
    AND (p_company IS NULL OR il.company_id = p_company)
),
bucket_of AS (
  -- inline helper via join; kept as a CTE for readability
  SELECT b.code, b.date, b.debit, b.credit, b.balance,
         coa.account_type,
         CASE
           WHEN coa.account_type LIKE 'asset%'     THEN 'Asset'
           WHEN coa.account_type LIKE 'liability%' THEN 'Liability'
           WHEN coa.account_type LIKE 'equity%'    THEN 'Equity'
           WHEN coa.account_type LIKE 'income%'    THEN 'Income'
           WHEN coa.account_type LIKE 'expense%'   THEN 'Expense'
           ELSE 'Other'
         END AS bucket
  FROM bucketed b
  JOIN coa ON coa.code = b.code
),
-- PERIOD slice -> Trial Balance + P&L
period AS (
  SELECT * FROM bucket_of
  WHERE (p_date_from IS NULL OR date >= p_date_from)
    AND (p_date_to   IS NULL OR date <= p_date_to)
),
-- AS-OF slice -> Balance Sheet (cumulative through p_date_to; ignores `from`)
asof AS (
  SELECT * FROM bucket_of
  WHERE (p_date_to IS NULL OR date <= p_date_to)
),
tb AS (
  SELECT p.code, cn.name, p.account_type, p.bucket,
         SUM(p.debit) AS debit, SUM(p.credit) AS credit, SUM(p.balance) AS balance
  FROM period p
  LEFT JOIN coa_named cn ON cn.code = p.code
  GROUP BY p.code, cn.name, p.account_type, p.bucket
),
pl AS (
  SELECT
    -COALESCE(SUM(balance) FILTER (WHERE bucket = 'Income'), 0)  AS income,
     COALESCE(SUM(balance) FILTER (WHERE bucket = 'Expense'), 0) AS expense
  FROM period
),
bs AS (
  SELECT
     COALESCE(SUM(balance) FILTER (WHERE bucket = 'Asset'), 0)      AS assets,
    -COALESCE(SUM(balance) FILTER (WHERE bucket = 'Liability'), 0)  AS liabilities,
    -COALESCE(SUM(balance) FILTER (WHERE bucket = 'Equity'), 0)     AS equity,
    -COALESCE(SUM(balance) FILTER (WHERE bucket = 'Income'), 0)
      - COALESCE(SUM(balance) FILTER (WHERE bucket = 'Expense'), 0) AS bs_result
  FROM asof
)
SELECT json_build_object(
  'summary', (
    SELECT json_build_object(
      'income',      round(pl.income, 2),
      'expense',     round(pl.expense, 2),
      'net',         round(pl.income - pl.expense, 2),
      'assets',      round(bs.assets, 2),
      'liabilities', round(bs.liabilities, 2),
      'equity',      round(bs.equity, 2),
      'bs_result',   round(bs.bs_result, 2),
      'bs_check',    round(bs.assets - (bs.liabilities + bs.equity + bs.bs_result), 2)
    ) FROM pl, bs
  ),
  'trial_balance', (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.code), '[]'::json)
    FROM (
      SELECT code, name, account_type, bucket,
             round(debit, 2) AS debit, round(credit, 2) AS credit, round(balance, 2) AS balance
      FROM tb
    ) t
  )
);
$$;

REVOKE ALL ON FUNCTION get_financial_reports(text, date, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_financial_reports(text, date, date) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
