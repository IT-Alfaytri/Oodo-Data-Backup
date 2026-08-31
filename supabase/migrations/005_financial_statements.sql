-- ============================================================
-- Financial Statements v3 — Odoo-style structured P&L + Balance Sheet
-- and per-account drill-down (General Ledger).
--
-- Extends get_financial_reports(text,date,date) with three new JSON keys
-- (summary + trial_balance are byte-for-byte the same as migration 004, so the
-- dashboard KPIs are untouched):
--
--   pl_accounts  : per-account P&L lines for the PERIOD [from,to], in NATURAL
--                  sign (income +, expense +). account_type lets the UI split
--                  Operating Income / Other Income / Cost of Revenue / Expenses
--                  / Depreciation and compute Gross Profit + Net Profit.
--   bs_accounts  : per-account Balance-Sheet lines AS OF `to` (asset +,
--                  liability +), for the Assets / Liabilities sections.
--   equity       : { current_year, previous_years, retained } — the P&L result
--                  is split at the fiscal-year start (Jan 1 of the as-of year)
--                  into Current-Year vs Previous-Years unallocated earnings, so
--                  Total Assets = Total Liabilities + Total Equity holds exactly
--                  (Total Equity = current_year + previous_years + retained =
--                   bs_result + equity-account balances).
--
-- Natural sign: balance * (-1 for income/liability/equity, +1 for asset/expense)
-- so every reported figure is a positive magnitude the UI can sum directly.
--
-- get_account_ledger(code,...) returns the posted journal items for one account
-- (move, date, communication, partner, debit, credit, running balance) for the
-- drill-down, company/date filtered, with a running balance over the full set
-- and a LIMIT for the preview.
-- ============================================================

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
bo AS (
  SELECT b.code, b.date, b.debit, b.credit, b.balance,
         coa.account_type,
         CASE
           WHEN coa.account_type LIKE 'asset%'     THEN 'Asset'
           WHEN coa.account_type LIKE 'liability%' THEN 'Liability'
           WHEN coa.account_type LIKE 'equity%'    THEN 'Equity'
           WHEN coa.account_type LIKE 'income%'    THEN 'Income'
           WHEN coa.account_type LIKE 'expense%'   THEN 'Expense'
           ELSE 'Other'
         END AS bucket,
         b.balance * CASE
           WHEN coa.account_type LIKE 'income%'
             OR coa.account_type LIKE 'liability%'
             OR coa.account_type LIKE 'equity%' THEN -1
           ELSE 1
         END AS nat
  FROM bucketed b
  JOIN coa ON coa.code = b.code
),
period AS (
  SELECT * FROM bo
  WHERE (p_date_from IS NULL OR date >= p_date_from)
    AND (p_date_to   IS NULL OR date <= p_date_to)
),
asof AS (
  SELECT * FROM bo
  WHERE (p_date_to IS NULL OR date <= p_date_to)
),
refd AS (
  SELECT COALESCE(p_date_to, (SELECT max(date) FROM bucketed)) AS ref_date
),
fy AS (
  SELECT date_trunc('year', (SELECT ref_date FROM refd))::date AS fy_start
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
),
pl_lines AS (
  SELECT p.code, cn.name, p.account_type, round(SUM(p.nat), 2) AS amount
  FROM period p
  LEFT JOIN coa_named cn ON cn.code = p.code
  WHERE p.bucket IN ('Income', 'Expense')
  GROUP BY p.code, cn.name, p.account_type
  HAVING round(SUM(p.nat), 2) <> 0
),
bs_lines AS (
  SELECT a.code, cn.name, a.account_type, round(SUM(a.nat), 2) AS amount
  FROM asof a
  LEFT JOIN coa_named cn ON cn.code = a.code
  WHERE a.bucket IN ('Asset', 'Liability')
  GROUP BY a.code, cn.name, a.account_type
  HAVING round(SUM(a.nat), 2) <> 0
),
eq AS (
  SELECT
    COALESCE(SUM(nat) FILTER (WHERE account_type = 'equity'), 0)            AS retained,
    COALESCE(SUM(nat) FILTER (WHERE account_type = 'equity_unaffected'), 0) AS unaffected,
    COALESCE(SUM(nat) FILTER (WHERE bucket = 'Income'), 0)                  AS income_asof,
    COALESCE(SUM(nat) FILTER (WHERE bucket = 'Expense'), 0)                 AS expense_asof,
    COALESCE(SUM(nat) FILTER (WHERE bucket = 'Income'
             AND date >= (SELECT fy_start FROM fy)), 0)                     AS income_fy,
    COALESCE(SUM(nat) FILTER (WHERE bucket = 'Expense'
             AND date >= (SELECT fy_start FROM fy)), 0)                     AS expense_fy
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
  ),
  'pl_accounts', (
    SELECT COALESCE(json_agg(row_to_json(x) ORDER BY x.code), '[]'::json)
    FROM (SELECT code, name, account_type, amount FROM pl_lines) x
  ),
  'bs_accounts', (
    SELECT COALESCE(json_agg(row_to_json(y) ORDER BY y.code), '[]'::json)
    FROM (SELECT code, name, account_type, amount FROM bs_lines) y
  ),
  'equity', (
    SELECT json_build_object(
      'current_year',   round(eq.income_fy - eq.expense_fy, 2),
      'previous_years', round(((eq.income_asof - eq.expense_asof)
                               - (eq.income_fy - eq.expense_fy)) + eq.unaffected, 2),
      'retained',       round(eq.retained, 2)
    ) FROM eq
  ),
  'ref_date', (SELECT ref_date FROM refd)
);
$$;

REVOKE ALL ON FUNCTION get_financial_reports(text, date, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_financial_reports(text, date, date) TO authenticated, service_role;

-- ------------------------------------------------------------
-- Drill-down: posted journal items for a single account.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_account_ledger(
  p_code      text,
  p_company   text DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to   date DEFAULT NULL,
  p_limit     int  DEFAULT 2000
)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH lines AS (
  SELECT il.id, il.move_name, il.date, il.name AS communication, il.partner_id,
         COALESCE(il.debit, 0)  AS debit,
         COALESCE(il.credit, 0) AS credit
  FROM invoice_lines il
  WHERE il.parent_state = 'posted'
    AND il.account_id IS NOT NULL
    AND split_part(il.account_id, ' ', 1) = p_code
    AND (p_company   IS NULL OR il.company_id = p_company)
    AND (p_date_from IS NULL OR il.date >= p_date_from)
    AND (p_date_to   IS NULL OR il.date <= p_date_to)
),
ordered AS (
  SELECT l.*,
         SUM(debit - credit) OVER (ORDER BY date, id ROWS UNBOUNDED PRECEDING) AS running
  FROM lines l
),
tot AS (
  SELECT count(*) AS n,
         COALESCE(SUM(debit), 0)  AS debit,
         COALESCE(SUM(credit), 0) AS credit
  FROM lines
)
SELECT json_build_object(
  'code',         p_code,
  'count',        (SELECT n FROM tot),
  'total_debit',  (SELECT round(debit, 2)  FROM tot),
  'total_credit', (SELECT round(credit, 2) FROM tot),
  'limited',      ((SELECT n FROM tot) > p_limit),
  'rows', (
    SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.date, r.id), '[]'::json)
    FROM (
      SELECT move_name, date, communication, partner_id,
             round(debit, 2)   AS debit,
             round(credit, 2)  AS credit,
             round(running, 2) AS running,
             id
      FROM ordered
      ORDER BY date, id
      LIMIT p_limit
    ) r
  )
);
$$;

REVOKE ALL ON FUNCTION get_account_ledger(text, text, date, date, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_account_ledger(text, text, date, date, int) TO authenticated, service_role;

-- Speeds the per-account drill-down (equality on the leading account code).
CREATE INDEX IF NOT EXISTS idx_invoice_lines_acct_code
  ON invoice_lines (split_part(account_id, ' ', 1))
  WHERE parent_state = 'posted';

NOTIFY pgrst, 'reload schema';
