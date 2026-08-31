"use client";

import { InvoiceListView } from "@/components/invoices/invoice-list-view";

export function CreditNotesClient() {
  return (
    <InvoiceListView
      moveType={["out_refund", "in_refund"]}
      title="Credit Notes"
      partnerLabel="Partner"
      totalLabel="Total Credit Notes"
      exportFileName="credit_notes"
    />
  );
}
