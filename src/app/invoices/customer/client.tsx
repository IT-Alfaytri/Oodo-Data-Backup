"use client";

import { InvoiceListView } from "@/components/invoices/invoice-list-view";

export function CustomerInvoicesClient() {
  return (
    <InvoiceListView
      moveType="out_invoice"
      title="Customer Invoices"
      partnerLabel="Customer"
      totalLabel="Total Invoices"
      exportFileName="customer_invoices"
    />
  );
}
