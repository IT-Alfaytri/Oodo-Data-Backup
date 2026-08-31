"use client";

import { OrderListView } from "@/components/orders/order-list-view";

export function SalesClient() {
  return (
    <OrderListView
      table="sale_orders"
      linesTable="sale_order_lines"
      linesFk="order_id"
      model="sale.order"
      partnerLabel="Customer"
      totalLabel="Total Orders"
      exportFileName="sales_orders"
      dateColumn="date_order"
      stateFilters={[
        { label: "Draft", value: "draft" },
        { label: "Sales Order", value: "sale" },
        { label: "Done", value: "done" },
        { label: "Cancelled", value: "cancel" },
      ]}
      statusColumns={[{ key: "invoice_status", label: "Invoice" }]}
      metaFields={[
        { key: "user_id", label: "Salesperson" },
        { key: "warehouse_id", label: "Warehouse" },
        { key: "margin_percent", label: "Margin", percent: true },
        { key: "x_studio_lpo_reference", label: "LPO Ref" },
      ]}
      lineColumns={[
        { key: "product_id", label: "Product" },
        { key: "product_uom_qty", label: "Qty", num: true },
        { key: "price_unit", label: "Price", money: true },
        { key: "discount", label: "Disc %", num: true },
        { key: "price_subtotal", label: "Subtotal", money: true },
        { key: "qty_delivered", label: "Delivered", num: true },
        { key: "qty_invoiced", label: "Invoiced", num: true },
      ]}
      exportColumns={[
        "id", "name", "state", "partner_id", "date_order", "amount_untaxed",
        "amount_tax", "amount_total", "invoice_status", "user_id", "warehouse_id", "margin",
      ]}
    />
  );
}
