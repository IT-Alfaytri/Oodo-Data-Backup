"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { generateCSV, downloadCSV } from "@/lib/export";

interface ExportDialogProps {
  tableName: string;
  dateColumn: string;
  columns: string[];
  filters?: Record<string, string>;
  fileName: string;
}

export function ExportDialog({
  tableName,
  dateColumn,
  columns,
  filters,
  fileName,
}: ExportDialogProps) {
  const supabase = createClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleExport() {
    setExporting(true);

    let query = supabase.from(tableName).select(columns.join(","));

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
    }

    if (from) query = query.gte(dateColumn, from);
    if (to) query = query.lte(dateColumn, to);

    const { data } = await query
      .order(dateColumn, { ascending: false })
      .limit(100000);

    if (data && data.length > 0) {
      const csv = generateCSV(data as unknown as Record<string, unknown>[], columns);
      const suffix = from || to ? `_${from || "start"}_${to || "end"}` : "";
      downloadCSV(csv, `${fileName}${suffix}.csv`);
    }

    setExporting(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Download className="h-4 w-4 mr-1.5" />
        Export CSV
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export to CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Leave dates empty to export all records. Exporting up to 100,000
            rows.
          </p>
          <Button onClick={handleExport} disabled={exporting} className="w-full">
            {exporting ? "Exporting..." : "Download CSV"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
