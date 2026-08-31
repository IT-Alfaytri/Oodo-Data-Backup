// Print a standalone HTML document to PDF via a hidden iframe. Isolates the
// printout from the app shell (nav/header) and avoids popup blockers — the
// browser's print dialog offers "Save as PDF".

export function printHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(iframe);

  const cleanup = () => {
    // Delay so the print dialog has fully taken over before we detach.
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {
        /* already gone */
      }
    }, 1000);
  };

  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    return;
  }

  const win = iframe.contentWindow;
  win.onafterprint = cleanup;
  doc.open();
  doc.write(html);
  doc.close();

  // Give the iframe a tick to lay out before invoking print.
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      cleanup();
    }
  }, 300);
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface PrintTable {
  columns: { label: string; align?: "left" | "right" }[];
  rows: {
    cells: (string | number | null)[];
    bold?: boolean;
    indent?: number;
    topBorder?: boolean;
    muted?: boolean;
  }[];
}

/** Builds a clean, self-contained printable report document (Odoo-like). */
export function buildReportHtml(opts: {
  title: string;
  company: string;
  period: string;
  table: PrintTable;
}): string {
  const { title, company, period, table } = opts;
  const fmt = (v: string | number | null) => {
    if (v === null || v === undefined || v === "") return "";
    if (typeof v === "number") {
      const cls = v < 0 ? "neg" : "";
      const t = v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `<span class="${cls}">${t}</span>`;
    }
    return esc(String(v));
  };

  const thead = table.columns
    .map((c) => `<th class="${c.align === "right" ? "r" : "l"}">${esc(c.label)}</th>`)
    .join("");

  const tbody = table.rows
    .map((r) => {
      const cls = [r.bold ? "b" : "", r.topBorder ? "tb" : "", r.muted ? "mut" : ""]
        .filter(Boolean)
        .join(" ");
      const tds = r.cells
        .map((cell, i) => {
          const col = table.columns[i];
          const align = col?.align === "right" ? "r" : "l";
          const pad = i === 0 && r.indent ? ` style="padding-left:${8 + r.indent * 18}px"` : "";
          return `<td class="${align}"${pad}>${fmt(cell)}</td>`;
        })
        .join("");
      return `<tr class="${cls}">${tds}</tr>`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1a1a2e; margin: 28px; font-size: 12px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #94a3b8; border-bottom: 1px solid #cbd5e1; padding: 6px 8px; }
  td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; }
  .l { text-align: left; } .r { text-align: right; font-variant-numeric: tabular-nums; }
  .b td { font-weight: 700; }
  .tb td { border-top: 1.5px solid #cbd5e1; }
  .mut td { color: #64748b; }
  .neg { color: #dc2626; }
  tr { break-inside: avoid; }
  @media print { body { margin: 0; } }
</style></head><body>
  <h1>${esc(title)}</h1>
  <div class="meta">${esc(company)} &middot; ${esc(period)} &middot; Amounts in QAR</div>
  <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
</body></html>`;
}
