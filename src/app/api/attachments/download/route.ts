import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ATTACHMENTS_DIR = path.join(
  process.cwd(),
  "Data",
  "odoo_data_export",
  "attachments"
);

const MODEL_FOLDER_MAP: Record<string, string> = {
  "sale.order": "sale_order",
  "purchase.order": "purchase_order",
  "account.move": "account_move",
  "account.payment": "account_payment",
  "stock.picking": "stock_picking",
  "stock.landed.cost": "stock_landed_cost",
  "stock.scrap": "stock_scrap",
  "res.partner": "res_partner",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const model = searchParams.get("model");
  const resId = searchParams.get("res_id");
  const fileName = searchParams.get("file");

  if (!model || !resId || !fileName) {
    return NextResponse.json(
      { error: "model, res_id, and file are required" },
      { status: 400 }
    );
  }

  const folder = MODEL_FOLDER_MAP[model];
  if (!folder) {
    return NextResponse.json({ error: "Unknown model" }, { status: 400 });
  }

  const filePath = path.join(ATTACHMENTS_DIR, folder, resId, fileName);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(ATTACHMENTS_DIR))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = fs.readFileSync(resolved);
    const ext = path.extname(fileName).toLowerCase();

    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".xls": "application/vnd.ms-excel",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".csv": "text/csv",
      ".txt": "text/plain",
      ".zip": "application/zip",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}
