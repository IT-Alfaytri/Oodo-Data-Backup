// Dependency-free XLSX writer: a stored (uncompressed) ZIP of minimal OOXML.
// Produces a genuine .xlsx (validated via an openpyxl round-trip) with bold
// headers and a #,##0.00 format on numeric cells — no third-party library.

export interface XlsxSheet {
  name: string;
  columns: string[];
  rows: (string | number | null)[][];
}

// ---- CRC32 ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---- byte helpers (little-endian) ----
function bytesOf(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}
function pushU16(arr: number[], v: number) {
  arr.push(v & 0xff, (v >>> 8) & 0xff);
}
function pushU32(arr: number[], v: number) {
  arr.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
}
function pushBytes(arr: number[], b: Uint8Array) {
  for (let i = 0; i < b.length; i++) arr.push(b[i]);
}

interface ZipFile {
  name: string;
  data: Uint8Array;
}

function zipStore(files: ZipFile[]): Uint8Array {
  const out: number[] = [];
  const central: number[] = [];
  let offset = 0;
  for (const f of files) {
    const nameB = bytesOf(f.name);
    const crc = crc32(f.data);
    const size = f.data.length;
    const local: number[] = [];
    pushU32(local, 0x04034b50);
    pushU16(local, 20);
    pushU16(local, 0);
    pushU16(local, 0);
    pushU16(local, 0);
    pushU16(local, 0);
    pushU32(local, crc);
    pushU32(local, size);
    pushU32(local, size);
    pushU16(local, nameB.length);
    pushU16(local, 0);
    pushBytes(local, nameB);
    pushBytes(local, f.data);
    pushBytes(out, new Uint8Array(local));

    pushU32(central, 0x02014b50);
    pushU16(central, 20);
    pushU16(central, 20);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU32(central, crc);
    pushU32(central, size);
    pushU32(central, size);
    pushU16(central, nameB.length);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU32(central, 0);
    pushU32(central, offset);
    pushBytes(central, nameB);
    offset += local.length;
  }
  const cdStart = out.length;
  pushBytes(out, new Uint8Array(central));
  pushU32(out, 0x06054b50);
  pushU16(out, 0);
  pushU16(out, 0);
  pushU16(out, files.length);
  pushU16(out, files.length);
  pushU32(out, central.length);
  pushU32(out, cdStart);
  pushU16(out, 0);
  return new Uint8Array(out);
}

// ---- OOXML ----
function xmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function colLetter(i: number): string {
  let s = "";
  i += 1;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

function cellXml(ref: string, value: string | number | null, style: number): string {
  const s = style ? ` s="${style}"` : "";
  if (value === null || value === undefined || value === "") return `<c r="${ref}"${s}/>`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"${s}><v>${value}</v></c>`;
  }
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(value))}</t></is></c>`;
}

function sheetXml(sheet: XlsxSheet): string {
  const rowsXml: string[] = [];
  const headerCells = sheet.columns.map((c, i) => cellXml(colLetter(i) + "1", c, 1)).join("");
  rowsXml.push(`<row r="1">${headerCells}</row>`);
  sheet.rows.forEach((row, r) => {
    const cells = row
      .map((v, i) => {
        const ref = colLetter(i) + (r + 2);
        const isNum = typeof v === "number" && Number.isFinite(v);
        return cellXml(ref, v, isNum ? 2 : 0);
      })
      .join("");
    rowsXml.push(`<row r="${r + 2}">${cells}</row>`);
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml.join(
    ""
  )}</sheetData></worksheet>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="1"><fill><patternFill patternType="none"/></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export function buildXlsx(sheets: XlsxSheet[]): Uint8Array {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("")}
</Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    )
    .join("")}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheets
    .map((s, i) => `<sheet name="${xmlEscape(s.name).slice(0, 31)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join("")}</sheets>
</workbook>`;
  const files: ZipFile[] = [
    { name: "[Content_Types].xml", data: bytesOf(contentTypes) },
    { name: "_rels/.rels", data: bytesOf(rootRels) },
    { name: "xl/workbook.xml", data: bytesOf(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: bytesOf(wbRels) },
    { name: "xl/styles.xml", data: bytesOf(STYLES) },
    ...sheets.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: bytesOf(sheetXml(s)),
    })),
  ];
  return zipStore(files);
}

export function downloadXlsx(sheets: XlsxSheet[], filename: string) {
  const data = buildXlsx(sheets);
  // Copy into a fresh ArrayBuffer so Blob gets a clean, correctly-typed buffer.
  const buf = new Uint8Array(data.length);
  buf.set(data);
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
