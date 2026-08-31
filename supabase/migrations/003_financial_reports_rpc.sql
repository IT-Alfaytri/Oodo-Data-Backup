-- ============================================================
-- Financial Reports RPC — Trial Balance / P&L / Balance Sheet
-- Aggregates the ledger (invoice_lines = account.move.line) joined to the
-- chart of accounts, server-side (REST aggregates are disabled on this project
-- and the ledger is ~370k rows). Posted entries only.
--
-- Join: invoice_lines.account_id is TEXT "<code> <name>"; the code is the first
-- token. chart_of_accounts has duplicate codes (multi-company), so it's
-- de-duplicated to (code, account_type) before the join to avoid double-counting.
-- ============================================================

CREATE OR REPLACE FUNCTION get_financial_reports()
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
  -- one display name per code (any is fine — dupes share code/type)
  SELECT code, min(name) AS name FROM chart_of_accounts WHERE code IS NOT NULL GROUP BY code
),
posted AS (
  SELECT split_part(il.account_id, ' ', 1) AS code,
         COALESCE(il.debit, 0)  AS debit,
         COALESCE(il.credit, 0) AS credit,
         COALESCE(il.balance, COALESCE(il.debit,0) - COALESCE(il.credit,0)) AS balance
  FROM invoice_lines il
  WHERE il.parent_state = 'posted' AND il.account_id IS NOT NULL
),
joined AS (
  SELECT p.code, coa.account_type,
         CASE
           WHEN coa.account_type LIKE 'asset%'     THEN 'Asset'
           WHEN coa.account_type LIKE 'liability%' THEN 'Liability'
           WHEN coa.account_type LIKE 'equity%'    THEN 'Equity'
           WHEN coa.account_type LIKE 'income%'    THEN 'Income'
           WHEN coa.account_type LIKE 'expense%'   THEN 'Expense'
           ELSE 'Other'
         END AS bucket,
         p.debit, p.credit, p.balance
  FROM posted p
  JOIN coa ON coa.code = p.code
),
tb AS (
  SELECT j.code, cn.name, j.account_type, j.bucket,
         SUM(j.debit) AS debit, SUM(j.credit) AS credit, SUM(j.balance) AS balance
  FROM joined j
  LEFT JOIN coa_named cn ON cn.code = j.code
  GROUP BY j.code, cn.name, j.account_type, j.bucket
),
sums AS (
  SELECT
    -COALESCE(SUM(balance) FILTER (WHERE bucket = 'Income'), 0)     AS income,
     COALESCE(SUM(balance) FILTER (WHERE bucket = 'Expense'), 0)    AS expense,
     COALESCE(SUM(balance) FILTER (WHERE bucket = 'Asset'), 0)      AS assets,
    -COALESCE(SUM(balance) FILTER (WHERE bucket = 'Liability'), 0)  AS liabilities,
    -COALESCE(SUM(balance) FILTER (WHERE bucket = 'Equity'), 0)     AS equity
  FROM tb
)
SELECT json_build_object(
  'summary', (
    SELECT json_build_object(
      'income',      round(income, 2),
      'expense',     round(expense, 2),
      'net',         round(income - expense, 2),
      'assets',      round(assets, 2),
      'liabilities', round(liabilities, 2),
      'equity',      round(equity, 2),
      'bs_check',    round(assets - (liabilities + equity + (income - expense)), 2)
    ) FROM sums
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

REVOKE ALL ON FUNCTION get_financial_reports() FROM public, anon;
GRANT EXECUTE ON FUNCTION get_financial_reports() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
