export type CsvCell = string | number | boolean | null | undefined;

/** Neutralise spreadsheet formula injection (=, +, -, @ at the start of text). */
function safe(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function toCSV(header: string[], rows: CsvCell[][]): string {
  const esc = (c: CsvCell): string => {
    if (c === null || c === undefined) return "";
    const s = typeof c === "string" ? safe(c) : String(c);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM so Excel opens UTF-8 correctly
  return "\uFEFF" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`,
      "Cache-Control": "no-store",
    },
  });
}
