-- ============================================================
-- Performance RPC Functions & Company-ID Indexes
-- ============================================================

-- ── Indexes on company_id for major tables ──

CREATE INDEX IF NOT EXISTS idx_sale_orders_company ON sale_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_product_templates_company ON product_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_quants_company ON stock_quants(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_pickings_company ON stock_pickings(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_company ON stock_moves(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);

-- ============================================================
-- 1) get_dashboard_stats
--    Returns a JSON object with counts for every dashboard
--    section plus a sales_total SUM, in a single round-trip.
--    Optional p_company filter narrows to one company.
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_company TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'sale_orders',       (SELECT count(*) FROM sale_orders
                            WHERE (p_company IS NULL OR company_id = p_company)),
    'purchase_orders',   (SELECT count(*) FROM purchase_orders
                            WHERE (p_company IS NULL OR company_id = p_company)),
    'product_templates', (SELECT count(*) FROM product_templates
                            WHERE (p_company IS NULL OR company_id = p_company)),
    'customers',         (SELECT count(*) FROM contacts
                            WHERE customer_rank > 0
                              AND (p_company IS NULL OR company_id = p_company)),
    'suppliers',         (SELECT count(*) FROM contacts
                            WHERE supplier_rank > 0
                              AND (p_company IS NULL OR company_id = p_company)),
    'payments',          (SELECT count(*) FROM payments
                            WHERE (p_company IS NULL OR company_id = p_company)),
    'customer_invoices', (SELECT count(*) FROM invoices
                            WHERE move_type = 'out_invoice'
                              AND (p_company IS NULL OR company_id = p_company)),
    'vendor_bills',      (SELECT count(*) FROM invoices
                            WHERE move_type = 'in_invoice'
                              AND (p_company IS NULL OR company_id = p_company)),
    'credit_notes',      (SELECT count(*) FROM invoices
                            WHERE move_type IN ('out_refund', 'in_refund')
                              AND (p_company IS NULL OR company_id = p_company)),
    'stock_quants',      (SELECT count(*) FROM stock_quants
                            WHERE (p_company IS NULL OR company_id = p_company)),
    'stock_pickings',    (SELECT count(*) FROM stock_pickings
                            WHERE (p_company IS NULL OR company_id = p_company)),
    'landed_costs',      (SELECT count(*) FROM landed_costs),
    'employees',         (SELECT count(*) FROM employees
                            WHERE (p_company IS NULL OR company_id = p_company)),
    'sales_total',       (SELECT coalesce(sum(amount_total), 0) FROM sale_orders
                            WHERE (p_company IS NULL OR company_id = p_company))
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- 2) get_table_sum
--    Returns a single numeric SUM via dynamic SQL.
--    Validates table/column names against a whitelist to
--    prevent SQL injection.
-- ============================================================

CREATE OR REPLACE FUNCTION get_table_sum(
  p_table      TEXT,
  p_column     TEXT,
  p_company    TEXT DEFAULT NULL,
  p_filter_col TEXT DEFAULT NULL,
  p_filter_val TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  allowed_tables  TEXT[] := ARRAY[
    'sale_orders', 'sale_order_lines',
    'purchase_orders', 'purchase_order_lines',
    'product_templates', 'product_variants',
    'contacts',
    'payments', 'invoices', 'invoice_lines',
    'stock_quants', 'stock_pickings', 'stock_moves', 'stock_move_lines',
    'landed_costs', 'landed_cost_lines',
    'valuation_layers', 'valuation_adjustments',
    'employees'
  ];
  allowed_columns TEXT[] := ARRAY[
    'amount_total', 'amount_untaxed', 'amount_tax', 'amount_residual',
    'amount', 'price_unit', 'price_subtotal', 'price_total',
    'quantity', 'product_qty', 'product_uom_qty', 'qty_done',
    'qty_delivered', 'qty_invoiced', 'qty_received',
    'reserved_quantity', 'inventory_quantity', 'quantity_done',
    'scrap_qty', 'discount', 'discount_amount',
    'margin', 'margin_percent', 'purchase_price',
    'debit', 'credit', 'balance',
    'list_price', 'standard_price', 'qty_available', 'virtual_available',
    'credit_limit', 'total_invoiced',
    'value', 'remaining_qty', 'remaining_value', 'unit_cost',
    'former_cost', 'additional_landed_cost', 'final_cost',
    'cost_share'
  ];
  allowed_filter_cols TEXT[] := ARRAY[
    'state', 'move_type', 'payment_type', 'partner_type',
    'type', 'invoice_status', 'receipt_status',
    'company_id', 'partner_id', 'product_id',
    'journal_id', 'currency_id', 'warehouse_id',
    'picking_type_id', 'location_id', 'location_dest_id',
    'categ_id', 'department_id', 'active',
    'payment_state', 'display_type', 'tracking',
    'cost_method', 'valuation', 'split_method',
    'usage', 'request_status'
  ];
  sql_text TEXT;
  result   NUMERIC;
BEGIN
  IF NOT (p_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table
      USING HINT = 'Table must be one of the allowed tables.';
  END IF;

  IF NOT (p_column = ANY(allowed_columns)) THEN
    RAISE EXCEPTION 'Invalid column name: %', p_column
      USING HINT = 'Column must be one of the allowed numeric columns.';
  END IF;

  IF p_filter_col IS NOT NULL AND NOT (p_filter_col = ANY(allowed_filter_cols)) THEN
    RAISE EXCEPTION 'Invalid filter column: %', p_filter_col
      USING HINT = 'Filter column must be one of the allowed filter columns.';
  END IF;

  sql_text := format('SELECT coalesce(sum(%I), 0) FROM %I WHERE true', p_column, p_table);

  IF p_company IS NOT NULL THEN
    sql_text := sql_text || format(' AND company_id = %L', p_company);
  END IF;

  IF p_filter_col IS NOT NULL AND p_filter_val IS NOT NULL THEN
    sql_text := sql_text || format(' AND %I = %L', p_filter_col, p_filter_val);
  END IF;

  EXECUTE sql_text INTO result;
  RETURN result;
END;
$$;
