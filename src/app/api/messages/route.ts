import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "Data", "odoo_data_export");
const MAIL_FILE = path.join(DATA_DIR, "mail_message.json");

interface MailMessage {
  id: number;
  subject: string | false;
  date: string;
  body: string;
  attachment_ids: Record<string, unknown> | number[];
  model: string;
  res_id: number;
  record_name: string | false;
  message_type: string;
  subtype_id: unknown;
  is_internal: boolean;
  email_from: string;
  author_id: unknown;
  tracking_value_ids: unknown;
}

let messageIndex: Map<string, MailMessage[]> | null = null;

function getIndex(): Map<string, MailMessage[]> {
  if (messageIndex) return messageIndex;

  const raw = fs.readFileSync(MAIL_FILE, "utf-8");
  const messages: MailMessage[] = JSON.parse(raw);

  messageIndex = new Map();
  for (const msg of messages) {
    if (!msg.model || !msg.res_id) continue;
    const key = `${msg.model}:${msg.res_id}`;
    const existing = messageIndex.get(key);
    if (existing) {
      existing.push(msg);
    } else {
      messageIndex.set(key, [msg]);
    }
  }

  return messageIndex;
}

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

  try {
    const index = getIndex();
    const key = `${model}:${resId}`;
    const messages = index.get(key) ?? [];

    const sorted = messages
      .filter((m) => m.body || m.tracking_value_ids)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const result = sorted.map((m) => {
      let authorName = "";
      if (Array.isArray(m.author_id) && m.author_id.length >= 2) {
        authorName = String(m.author_id[1]);
      } else if (m.email_from) {
        authorName = m.email_from;
      }

      return {
        id: m.id,
        date: m.date,
        subject: m.subject || null,
        body: m.body || "",
        author: authorName,
        message_type: m.message_type,
        is_internal: m.is_internal,
      };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}
