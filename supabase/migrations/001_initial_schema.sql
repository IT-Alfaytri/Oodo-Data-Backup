-- ============================================================
-- Odoo Data Viewer — Initial Schema
-- ============================================================

-- ── Auth & Annotations ──

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  display_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_annotations (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  table_name  TEXT NOT NULL,
  record_id   INTEGER NOT NULL,
  note        TEXT,
  tags        TEXT[],
  is_reviewed BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, table_name, record_id)
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at on annotations
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER annotations_updated_at
  BEFORE UPDATE ON user_annotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Sales ──

CREATE TABLE sale_orders (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  state               TEXT,
  partner_id          TEXT,
  date_order          TIMESTAMPTZ,
  amount_untaxed      NUMERIC,
  amount_tax          NUMERIC,
  amount_total        NUMERIC,
  invoice_status      TEXT,
  user_id             TEXT,
  team_id             TEXT,
  warehouse_id        TEXT,
  margin              NUMERIC,
  margin_percent      NUMERIC,
  discount_type       TEXT,
  discount_amount     NUMERIC,
  currency_id         TEXT,
  company_id          TEXT,
  x_studio_lpo_reference TEXT,
  x_studio_amount_in_words TEXT,
  raw_data            JSONB
);

CREATE TABLE sale_order_lines (
  id                  INTEGER PRIMARY KEY,
  order_id            INTEGER REFERENCES sale_orders(id),
  order_name          TEXT,
  product_id          TEXT,
  product_uom_qty     NUMERIC,
  price_unit          NUMERIC,
  discount            NUMERIC,
  price_subtotal      NUMERIC,
  price_total         NUMERIC,
  qty_delivered       NUMERIC,
  qty_invoiced        NUMERIC,
  margin              NUMERIC,
  margin_percent      NUMERIC,
  purchase_price      NUMERIC,
  state               TEXT,
  raw_data            JSONB
);

-- ── Purchase ──

CREATE TABLE purchase_orders (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  state               TEXT,
  partner_id          TEXT,
  date_order          TIMESTAMPTZ,
  date_approve        TIMESTAMPTZ,
  amount_untaxed      NUMERIC,
  amount_tax          NUMERIC,
  amount_total        NUMERIC,
  invoice_status      TEXT,
  receipt_status      TEXT,
  discount_type       TEXT,
  discount_amount     NUMERIC,
  currency_id         TEXT,
  company_id          TEXT,
  x_studio_amount_in_words TEXT,
  raw_data            JSONB
);

CREATE TABLE purchase_order_lines (
  id                  INTEGER PRIMARY KEY,
  order_id            INTEGER REFERENCES purchase_orders(id),
  product_id          TEXT,
  product_qty         NUMERIC,
  price_unit          NUMERIC,
  price_subtotal      NUMERIC,
  price_total         NUMERIC,
  qty_received        NUMERIC,
  qty_invoiced        NUMERIC,
  discount            NUMERIC,
  state               TEXT,
  raw_data            JSONB
);

-- ── Products ──

CREATE TABLE product_templates (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  type                TEXT,
  categ_id            TEXT,
  list_price          NUMERIC,
  standard_price      NUMERIC,
  uom_id              TEXT,
  qty_available       NUMERIC,
  virtual_available   NUMERIC,
  tracking            TEXT,
  cost_method         TEXT,
  valuation           TEXT,
  sale_ok             BOOLEAN,
  purchase_ok         BOOLEAN,
  active              BOOLEAN,
  company_id          TEXT,
  raw_data            JSONB
);

CREATE TABLE product_variants (
  id                  INTEGER PRIMARY KEY,
  product_tmpl_id     INTEGER REFERENCES product_templates(id),
  name                TEXT,
  barcode             TEXT,
  default_code        TEXT,
  qty_available       NUMERIC,
  standard_price      NUMERIC,
  raw_data            JSONB
);

CREATE TABLE product_categories (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  complete_name       TEXT,
  parent_id           TEXT,
  product_count       INTEGER,
  raw_data            JSONB
);

-- ── Contacts ──

CREATE TABLE contacts (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  is_company          BOOLEAN,
  type                TEXT,
  street              TEXT,
  city                TEXT,
  country_id          TEXT,
  email               TEXT,
  phone               TEXT,
  mobile              TEXT,
  customer_rank       INTEGER,
  supplier_rank       INTEGER,
  credit              NUMERIC,
  debit               NUMERIC,
  total_invoiced      NUMERIC,
  credit_limit        NUMERIC,
  company_id          TEXT,
  parent_id           TEXT,
  active              BOOLEAN,
  raw_data            JSONB
);

-- ── Accounting ──

CREATE TABLE chart_of_accounts (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  code                TEXT,
  account_type        TEXT,
  internal_group      TEXT,
  reconcile           BOOLEAN,
  company_id          TEXT,
  raw_data            JSONB
);

CREATE TABLE journals (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  code                TEXT,
  type                TEXT,
  company_id          TEXT,
  raw_data            JSONB
);

CREATE TABLE payments (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  date                DATE,
  state               TEXT,
  payment_type        TEXT,
  partner_type        TEXT,
  partner_id          TEXT,
  amount              NUMERIC,
  currency_id         TEXT,
  journal_id          TEXT,
  ref                 TEXT,
  company_id          TEXT,
  raw_data            JSONB
);

CREATE TABLE bank_statement_lines (
  id                  INTEGER PRIMARY KEY,
  move_id             TEXT,
  partner_id          TEXT,
  payment_ref         TEXT,
  amount              NUMERIC,
  is_reconciled       BOOLEAN,
  raw_data            JSONB
);

-- ── Invoices ──

CREATE TABLE invoices (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  date                DATE,
  state               TEXT,
  move_type           TEXT,
  partner_id          TEXT,
  amount_untaxed      NUMERIC,
  amount_tax          NUMERIC,
  amount_total        NUMERIC,
  amount_residual     NUMERIC,
  payment_state       TEXT,
  invoice_origin      TEXT,
  invoice_date        DATE,
  invoice_date_due    DATE,
  journal_id          TEXT,
  currency_id         TEXT,
  company_id          TEXT,
  raw_data            JSONB
);

CREATE TABLE invoice_lines (
  id                  INTEGER PRIMARY KEY,
  move_id             INTEGER REFERENCES invoices(id),
  move_name           TEXT,
  date                DATE,
  parent_state        TEXT,
  account_id          TEXT,
  partner_id          TEXT,
  product_id          TEXT,
  name                TEXT,
  quantity            NUMERIC,
  price_unit          NUMERIC,
  discount            NUMERIC,
  debit               NUMERIC,
  credit              NUMERIC,
  balance             NUMERIC,
  display_type        TEXT,
  matching_number     TEXT,
  currency_id         TEXT,
  journal_id          TEXT,
  company_id          TEXT,
  raw_data            JSONB
);

-- ── Reconciliation ──

CREATE TABLE full_reconcile (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  raw_data            JSONB
);

CREATE TABLE partial_reconcile (
  id                  INTEGER PRIMARY KEY,
  debit_move_id       TEXT,
  credit_move_id      TEXT,
  full_reconcile_id   INTEGER REFERENCES full_reconcile(id),
  amount              NUMERIC,
  max_date            DATE,
  raw_data            JSONB
);

-- ── Inventory ──

CREATE TABLE warehouses (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  code                TEXT,
  company_id          TEXT,
  raw_data            JSONB
);

CREATE TABLE stock_locations (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  complete_name       TEXT,
  usage               TEXT,
  warehouse_id        TEXT,
  raw_data            JSONB
);

CREATE TABLE stock_quants (
  id                  INTEGER PRIMARY KEY,
  product_id          TEXT,
  location_id         TEXT,
  quantity            NUMERIC,
  reserved_quantity   NUMERIC,
  inventory_quantity  NUMERIC,
  lot_id              TEXT,
  in_date             TIMESTAMPTZ,
  company_id          TEXT,
  raw_data            JSONB
);

-- ── Stock Movements ──

CREATE TABLE stock_pickings (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  origin              TEXT,
  partner_id          TEXT,
  picking_type_id     TEXT,
  location_id         TEXT,
  location_dest_id    TEXT,
  date                TIMESTAMPTZ,
  date_done           TIMESTAMPTZ,
  state               TEXT,
  scheduled_date      TIMESTAMPTZ,
  company_id          TEXT,
  raw_data            JSONB
);

CREATE TABLE stock_moves (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  date                TIMESTAMPTZ,
  product_id          TEXT,
  product_uom         TEXT,
  product_uom_qty     NUMERIC,
  quantity_done       NUMERIC,
  location_id         TEXT,
  location_dest_id    TEXT,
  picking_id          INTEGER REFERENCES stock_pickings(id),
  origin              TEXT,
  state               TEXT,
  price_unit          NUMERIC,
  partner_id          TEXT,
  warehouse_id        TEXT,
  company_id          TEXT,
  raw_data            JSONB
);

CREATE TABLE stock_move_lines (
  id                  INTEGER PRIMARY KEY,
  move_id             INTEGER REFERENCES stock_moves(id),
  product_id          TEXT,
  qty_done            NUMERIC,
  location_id         TEXT,
  location_dest_id    TEXT,
  reference           TEXT,
  raw_data            JSONB
);

CREATE TABLE stock_scraps (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  product_id          TEXT,
  scrap_qty           NUMERIC,
  scrap_location_id   TEXT,
  date_done           TIMESTAMPTZ,
  raw_data            JSONB
);

-- ── Costing ──

CREATE TABLE landed_costs (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  date                DATE,
  state               TEXT,
  amount_total        NUMERIC,
  vendor_bill_id      TEXT,
  account_journal_id  TEXT,
  raw_data            JSONB
);

CREATE TABLE landed_cost_lines (
  id                  INTEGER PRIMARY KEY,
  cost_id             INTEGER REFERENCES landed_costs(id),
  name                TEXT,
  product_id          TEXT,
  price_unit          NUMERIC,
  split_method        TEXT,
  account_id          TEXT,
  raw_data            JSONB
);

CREATE TABLE valuation_layers (
  id                  INTEGER PRIMARY KEY,
  product_id          TEXT,
  quantity            NUMERIC,
  unit_cost           NUMERIC,
  value               NUMERIC,
  remaining_qty       NUMERIC,
  remaining_value     NUMERIC,
  stock_move_id       TEXT,
  stock_landed_cost_id TEXT,
  company_id          TEXT,
  raw_data            JSONB
);

CREATE TABLE valuation_adjustments (
  id                  INTEGER PRIMARY KEY,
  name                TEXT,
  cost_id             INTEGER REFERENCES landed_costs(id),
  product_id          TEXT,
  former_cost         NUMERIC,
  additional_landed_cost NUMERIC,
  final_cost          NUMERIC,
  raw_data            JSONB
);

-- ── Manufacturing, HR, Approvals ──

CREATE TABLE bom_lines (
  id INTEGER PRIMARY KEY,
  product_id TEXT,
  product_qty NUMERIC,
  bom_id TEXT,
  cost_share NUMERIC,
  raw_data JSONB
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT,
  department_id TEXT,
  job_title TEXT,
  company_id TEXT,
  raw_data JSONB
);

CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT,
  company_id TEXT,
  raw_data JSONB
);

CREATE TABLE approval_requests (
  id INTEGER PRIMARY KEY,
  name TEXT,
  category_id TEXT,
  request_status TEXT,
  date TEXT,
  raw_data JSONB
);

-- ── Indexes ──

CREATE INDEX idx_sale_orders_state ON sale_orders(state);
CREATE INDEX idx_sale_orders_date ON sale_orders(date_order);
CREATE INDEX idx_sale_orders_partner ON sale_orders(partner_id);
CREATE INDEX idx_sale_order_lines_order ON sale_order_lines(order_id);

CREATE INDEX idx_purchase_orders_state ON purchase_orders(state);
CREATE INDEX idx_purchase_order_lines_order ON purchase_order_lines(order_id);

CREATE INDEX idx_invoices_move_type ON invoices(move_type);
CREATE INDEX idx_invoices_state ON invoices(state);
CREATE INDEX idx_invoices_date ON invoices(date);
CREATE INDEX idx_invoices_partner ON invoices(partner_id);
CREATE INDEX idx_invoice_lines_move ON invoice_lines(move_id);

CREATE INDEX idx_contacts_customer ON contacts(customer_rank);
CREATE INDEX idx_contacts_supplier ON contacts(supplier_rank);

CREATE INDEX idx_payments_date ON payments(date);
CREATE INDEX idx_payments_partner ON payments(partner_id);

CREATE INDEX idx_stock_pickings_state ON stock_pickings(state);
CREATE INDEX idx_stock_pickings_date ON stock_pickings(date);
CREATE INDEX idx_stock_moves_picking ON stock_moves(picking_id);
CREATE INDEX idx_stock_move_lines_move ON stock_move_lines(move_id);

CREATE INDEX idx_valuation_layers_product ON valuation_layers(product_id);
CREATE INDEX idx_landed_cost_lines_cost ON landed_cost_lines(cost_id);
CREATE INDEX idx_valuation_adjustments_cost ON valuation_adjustments(cost_id);

CREATE INDEX idx_annotations_lookup ON user_annotations(table_name, record_id);
CREATE INDEX idx_annotations_user ON user_annotations(user_id);

-- ── Row Level Security ──

-- Annotations: read all, write own
ALTER TABLE user_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "annotations_read" ON user_annotations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "annotations_insert" ON user_annotations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "annotations_update" ON user_annotations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "annotations_delete" ON user_annotations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Profiles: read all, update own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- All data tables: read-only for authenticated users
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'sale_orders','sale_order_lines',
      'purchase_orders','purchase_order_lines',
      'product_templates','product_variants','product_categories',
      'contacts',
      'chart_of_accounts','journals','payments','bank_statement_lines',
      'invoices','invoice_lines',
      'full_reconcile','partial_reconcile',
      'warehouses','stock_locations','stock_quants',
      'stock_pickings','stock_moves','stock_move_lines','stock_scraps',
      'landed_costs','landed_cost_lines','valuation_layers','valuation_adjustments',
      'bom_lines','employees','departments','approval_requests'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY "read_%s" ON %I FOR SELECT TO authenticated USING (true)',
      tbl, tbl
    );
  END LOOP;
END;
$$;
