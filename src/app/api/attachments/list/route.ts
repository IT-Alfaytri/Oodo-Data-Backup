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

  if (!model || !resId) {
    return NextResponse.json(
      { error: "model and res_id are required" },
      { status: 400 }
    );
  }

  const folder = MODEL_FOLDER_MAP[model];
  if (!folder) {
    return NextResponse.json([]);
  }

  const recordDir = path.join(ATTACHMENTS_DIR, folder, resId);

  try {
    if (!fs.existsSync(recordDir)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(recordDir);
    const result = files.map((name) => {
      const stat = fs.statSync(path.join(recordDir, name));
      return {
        name,
        size: stat.size,
        downloadUrl: `/api/attachments/download?model=${encodeURIComponent(model)}&res_id=${resId}&file=${encodeURIComponent(name)}`,
      };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to list attachments" },
      { status: 500 }
    );
  }
}
