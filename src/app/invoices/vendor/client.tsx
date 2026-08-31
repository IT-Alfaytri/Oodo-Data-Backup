"use client";

import { InvoiceListView } from "@/components/invoices/invoice-list-view";

export function VendorBillsClient() {
  return (
    <InvoiceListView
      moveType="in_invoice"
      title="Vendor Bills"
      partnerLabel="Vendor"
      totalLabel="Total Bills"
      exportFileName="vendor_bills"
    />
  );
}
