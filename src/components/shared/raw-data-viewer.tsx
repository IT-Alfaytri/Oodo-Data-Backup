"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Code } from "lucide-react";

export function RawDataViewer({
  data,
  title,
}: {
  data: Record<string, unknown>;
  title?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        <Code className="h-4 w-4 mr-1" />
        Raw Data
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? "Raw JSON Data"}</DialogTitle>
        </DialogHeader>
        <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
