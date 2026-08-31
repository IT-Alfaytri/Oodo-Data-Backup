"use client";

import { OrderListView } from "@/components/orders/order-list-view";

export function PurchasesClient() {
  return (
    <OrderListView
      table="purchase_orders"
      linesTable="purchase_order_lines"
      linesFk="order_id"
      model="purchase.order"
      partnerLabel="Vendor"
      totalLabel="Total Orders"
      exportFileName="purchase_orders"
      dateColumn="date_order"
      stateFilters={[
        { label: "Draft", value: "draft" },
        { label: "Purchase Order", value: "purchase" },
        { label: "Done", value: "done" },
        { label: "Cancelled", value: "cancel" },
      ]}
      statusColumns={[
        { key: "invoice_status", label: "Invoice" },
        { key: "receipt_status", label: "Receipt" },
      ]}
      metaFields={[
        { key: "date_approve", label: "Approved" },
        { key: "discount_type", label: "Discount Type" },
      ]}
      lineColumns={[
        { key: "product_id", label: "Product" },
        { key: "product_qty", label: "Qty", num: true },
        { key: "price_unit", label: "Price", money: true },
        { key: "discount", label: "Disc %", num: true },
        { key: "price_subtotal", label: "Subtotal", money: true },
        { key: "qty_received", label: "Received", num: true },
        { key: "qty_invoiced", label: "Invoiced", num: true },
      ]}
      exportColumns={[
        "id", "name", "state", "partner_id", "date_order", "date_approve",
        "amount_untaxed", "amount_tax", "amount_total", "invoice_status", "receipt_status",
      ]}
    />
  );
}
