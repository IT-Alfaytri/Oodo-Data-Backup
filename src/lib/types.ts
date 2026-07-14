export interface SaleOrder {
  id: number;
  name: string;
  state: string;
  partner_id: string;
  date_order: string;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  invoice_status: string;
  user_id: string;
  team_id: string;
  warehouse_id: string;
  margin: number;
  margin_percent: number;
  discount_type: string;
  discount_amount: number;
  currency_id: string;
  company_id: string;
  x_studio_lpo_reference: string;
  x_studio_amount_in_words: string;
  raw_data: Record<string, unknown>;
}

export interface SaleOrderLine {
  id: number;
  order_id: number;
  order_name: string;
  product_id: string;
  product_uom_qty: number;
  price_unit: number;
  discount: number;
  price_subtotal: number;
  price_total: number;
  qty_delivered: number;
  qty_invoiced: number;
  margin: number;
  margin_percent: number;
  purchase_price: number;
  state: string;
  raw_data: Record<string, unknown>;
}

export interface PurchaseOrder {
  id: number;
  name: string;
  state: string;
  partner_id: string;
  date_order: string;
  date_approve: string;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  invoice_status: string;
  receipt_status: string;
  discount_type: string;
  discount_amount: number;
  currency_id: string;
  company_id: string;
  x_studio_amount_in_words: string;
  raw_data: Record<string, unknown>;
}

export interface PurchaseOrderLine {
  id: number;
  order_id: number;
  product_id: string;
  product_qty: number;
  price_unit: number;
  price_subtotal: number;
  price_total: number;
  qty_received: number;
  qty_invoiced: number;
  discount: number;
  state: string;
  raw_data: Record<string, unknown>;
}

export interface Invoice {
  id: number;
  name: string;
  date: string;
  state: string;
  move_type: string;
  partner_id: string;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  amount_residual: number;
  payment_state: string;
  invoice_origin: string;
  invoice_date: string;
  invoice_date_due: string;
  journal_id: string;
  currency_id: string;
  company_id: string;
  raw_data: Record<string, unknown>;
}

export interface InvoiceLine {
  id: number;
  move_id: number;
  move_name: string;
  date: string;
  parent_state: string;
  account_id: string;
  partner_id: string;
  product_id: string;
  name: string;
  quantity: number;
  price_unit: number;
  discount: number;
  debit: number;
  credit: number;
  balance: number;
  display_type: string;
  matching_number: string;
  currency_id: string;
  journal_id: string;
  company_id: string;
  raw_data: Record<string, unknown>;
}

export interface Contact {
  id: number;
  name: string;
  is_company: boolean;
  type: string;
  street: string;
  city: string;
  country_id: string;
  email: string;
  phone: string;
  mobile: string;
  customer_rank: number;
  supplier_rank: number;
  credit: number;
  debit: number;
  total_invoiced: number;
  credit_limit: number;
  company_id: string;
  parent_id: string;
  active: boolean;
  raw_data: Record<string, unknown>;
}

export interface Payment {
  id: number;
  name: string;
  date: string;
  state: string;
  payment_type: string;
  partner_type: string;
  partner_id: string;
  amount: number;
  currency_id: string;
  journal_id: string;
  ref: string;
  company_id: string;
  raw_data: Record<string, unknown>;
}

export interface ProductTemplate {
  id: number;
  name: string;
  type: string;
  categ_id: string;
  list_price: number;
  standard_price: number;
  uom_id: string;
  qty_available: number;
  virtual_available: number;
  tracking: string;
  cost_method: string;
  valuation: string;
  sale_ok: boolean;
  purchase_ok: boolean;
  active: boolean;
  company_id: string;
  raw_data: Record<string, unknown>;
}

export interface StockPicking {
  id: number;
  name: string;
  origin: string;
  partner_id: string;
  picking_type_id: string;
  location_id: string;
  location_dest_id: string;
  date: string;
  date_done: string;
  state: string;
  scheduled_date: string;
  company_id: string;
  raw_data: Record<string, unknown>;
}

export interface StockMove {
  id: number;
  name: string;
  date: string;
  product_id: string;
  product_uom: string;
  product_uom_qty: number;
  quantity_done: number;
  location_id: string;
  location_dest_id: string;
  picking_id: number;
  origin: string;
  state: string;
  price_unit: number;
  partner_id: string;
  warehouse_id: string;
  company_id: string;
  raw_data: Record<string, unknown>;
}

export interface StockQuant {
  id: number;
  product_id: string;
  location_id: string;
  quantity: number;
  reserved_quantity: number;
  inventory_quantity: number;
  lot_id: string;
  in_date: string;
  company_id: string;
  raw_data: Record<string, unknown>;
}

export interface LandedCost {
  id: number;
  name: string;
  date: string;
  state: string;
  amount_total: number;
  vendor_bill_id: string;
  account_journal_id: string;
  raw_data: Record<string, unknown>;
}

export interface UserAnnotation {
  id: number;
  user_id: string;
  table_name: string;
  record_id: number;
  note: string;
  tags: string[];
  is_reviewed: boolean;
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string; email: string };
}

// ── Remaining tables (schema: supabase/migrations/001_initial_schema.sql) ──
// Not spelled out verbatim in the task brief; derived from the SQL columns
// following the same conventions as the types above.

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface ProductVariant {
  id: number;
  product_tmpl_id: number;
  name: string;
  barcode: string;
  default_code: string;
  qty_available: number;
  standard_price: number;
  raw_data: Record<string, unknown>;
}

export interface ProductCategory {
  id: number;
  name: string;
  complete_name: string;
  parent_id: string;
  product_count: number;
  raw_data: Record<string, unknown>;
}

export interface ChartOfAccount {
  id: number;
  name: string;
  code: string;
  account_type: string;
  internal_group: string;
  reconcile: boolean;
  company_id: string;
  raw_data: Record<string, unknown>;
}

export interface Journal {
  id: number;
  name: string;
  code: string;
  type: string;
  company_id: string;
  raw_data: Record<string, unknown>;
}

export interface BankStatementLine {
  id: number;
  move_id: string;
  partner_id: string;
  payment_ref: string;
  amount: number;
  is_reconciled: boolean;
  raw_data: Record<string, unknown>;
}

export interface FullReconcile {
  id: number;
  name: string;
  raw_data: Record<string, unknown>;
}

export interface PartialReconcile {
  id: number;
  debit_move_id: string;
  credit_move_id: string;
  full_reconcile_id: number;
  amount: number;
  max_date: string;
  raw_data: Record<string, unknown>;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  company_id: string;
  raw_data: Record<string, unknown>;
}

export interface StockLocation {
  id: number;
  name: string;
  complete_name: string;
  usage: string;
  warehouse_id: string;
  raw_data: Record<string, unknown>;
}

export interface StockMoveLine {
  id: number;
  move_id: number;
  product_id: string;
  qty_done: number;
  location_id: string;
  location_dest_id: string;
  reference: string;
  raw_data: Record<string, unknown>;
}

export interface StockScrap {
  id: number;
  name: string;
  product_id: string;
  scrap_qty: number;
  scrap_location_id: string;
  date_done: string;
  raw_data: Record<string, unknown>;
}

export interface LandedCostLine {
  id: number;
  cost_id: number;
  name: string;
  product_id: string;
  price_unit: number;
  split_method: string;
  account_id: string;
  raw_data: Record<string, unknown>;
}

export interface ValuationLayer {
  id: number;
  product_id: string;
  quantity: number;
  unit_cost: number;
  value: number;
  remaining_qty: number;
  remaining_value: number;
  stock_move_id: string;
  stock_landed_cost_id: string;
  company_id: string;
  raw_data: Record<string, unknown>;
}

export interface ValuationAdjustment {
  id: number;
  name: string;
  cost_id: number;
  product_id: string;
  former_cost: number;
  additional_landed_cost: number;
  final_cost: number;
  raw_data: Record<string, unknown>;
}

export interface BomLine {
  id: number;
  product_id: string;
  product_qty: number;
  bom_id: string;
  cost_share: number;
  raw_data: Record<string, unknown>;
}

export interface Employee {
  id: number;
  name: string;
  department_id: string;
  job_title: string;
  company_id: string;
  raw_data: Record<string, unknown>;
}

export interface Department {
  id: number;
  name: string;
  company_id: string;
  raw_data: Record<string, unknown>;
}

export interface ApprovalRequest {
  id: number;
  name: string;
  category_id: string;
  request_status: string;
  date: string;
  raw_data: Record<string, unknown>;
}
