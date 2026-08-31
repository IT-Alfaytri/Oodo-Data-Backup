"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Paperclip, Download, FileText } from "lucide-react";

interface Message {
  id: number;
  date: string;
  subject: string | null;
  body: string;
  author: string;
  message_type: string;
  is_internal: boolean;
}

interface Attachment {
  name: string;
  size: number;
  downloadUrl: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

const FILE_ICONS: Record<string, string> = {
  ".pdf": "text-red-500",
  ".xlsx": "text-green-600",
  ".xls": "text-green-600",
  ".doc": "text-blue-600",
  ".docx": "text-blue-600",
  ".png": "text-purple-500",
  ".jpg": "text-purple-500",
  ".jpeg": "text-purple-500",
};

function getFileColor(name: string): string {
  const ext = name.substring(name.lastIndexOf(".")).toLowerCase();
  return FILE_ICONS[ext] || "text-gray-400";
}

interface ChatterPanelProps {
  model: string;
  resId: number;
}

export function ChatterPanel({ model, resId }: ChatterPanelProps) {
  const [tab, setTab] = useState<"messages" | "attachments">("messages");
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingMsg, setLoadingMsg] = useState(true);
  const [loadingAtt, setLoadingAtt] = useState(true);

  useEffect(() => {
    setLoadingMsg(true);
    setLoadingAtt(true);

    fetch(`/api/messages?model=${encodeURIComponent(model)}&res_id=${resId}`)
      .then((r) => r.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsg(false));

    fetch(
      `/api/attachments/list?model=${encodeURIComponent(model)}&res_id=${resId}`
    )
      .then((r) => r.json())
      .then((data) => setAttachments(Array.isArray(data) ? data : []))
      .catch(() => setAttachments([]))
      .finally(() => setLoadingAtt(false));
  }, [model, resId]);

  return (
    <div className="border-t border-gray-100">
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab("messages")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
            tab === "messages"
              ? "text-[#1a1a2e] border-b-2 border-[#1a1a2e]"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Messages
          {!loadingMsg && messages.length > 0 && (
            <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("attachments")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
            tab === "attachments"
              ? "text-[#1a1a2e] border-b-2 border-[#1a1a2e]"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Paperclip className="h-3.5 w-3.5" />
          Attachments
          {!loadingAtt && attachments.length > 0 && (
            <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">
              {attachments.length}
            </span>
          )}
        </button>
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {tab === "messages" && (
          <div>
            {loadingMsg ? (
              <div className="p-4 text-center text-sm text-gray-400">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">
                No messages
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {messages.map((msg) => (
                  <div key={msg.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {msg.author || "System"}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatDate(msg.date)}
                      </span>
                      {msg.is_internal && (
                        <span className="text-[10px] bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded">
                          Internal
                        </span>
                      )}
                    </div>
                    {msg.subject && (
                      <div className="text-xs font-medium text-gray-600 mb-0.5">
                        {msg.subject}
                      </div>
                    )}
                    {msg.body && (
                      <div className="text-xs text-gray-500 leading-relaxed">
                        {stripHtml(msg.body)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "attachments" && (
          <div>
            {loadingAtt ? (
              <div className="p-4 text-center text-sm text-gray-400">
                Loading attachments...
              </div>
            ) : attachments.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">
                No attachments
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {attachments.map((att) => (
                  <a
                    key={att.name}
                    href={att.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
                  >
                    <FileText
                      className={`h-4 w-4 flex-shrink-0 ${getFileColor(att.name)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-700 truncate group-hover:text-[#1a1a2e]">
                        {att.name}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {formatFileSize(att.size)}
                      </div>
                    </div>
                    <Download className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
