// Builds a branded PDF from the planner's Markdown output. Loaded on demand (browser only).
type Meta = { sector?: string; employees: string; startDate: string; submissionDate: string; planEnd: string };

// Brand colours mirror the Legislative glass tokens (PDF cannot read CSS variables).
const INK: [number, number, number] = [12, 23, 38];
const PRIMARY: [number, number, number] = [13, 99, 168];
const TEAL: [number, number, number] = [15, 148, 136];
const MUTED: [number, number, number] = [90, 104, 122];
const LINE: [number, number, number] = [214, 222, 234];

// Standard PDF fonts only cover WinAnsi; map common Unicode and drop the rest.
const clean = (s: string) =>
  s.replace(/[\u2010-\u2012]/g, "-").replace(/\u2192/g, "->").replace(/\u2264/g, "<=").replace(/\u2265/g, ">=")
    .replace(/\u00a7/g, "s").replace(/[^\x09\x0a\x0d\x20-\x7e\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026]/g, "");
const strip = (s: string) => clean(s.replace(/\*\*|__|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")).trim();

export async function exportPlanPdf(markdown: string, meta: Meta) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = 0;

  // Cover band
  doc.setFillColor(...PRIMARY); doc.rect(0, 0, W, 150, "F");
  doc.setFillColor(...TEAL); doc.rect(0, 150, W, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("DDHS EQUITY INTELLIGENCE", M, 48);
  doc.setFont("times", "bold"); doc.setFontSize(26); doc.text("Employment Equity Implementation Plan", M, 88);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(clean(`${meta.sector ?? ""}  |  ${meta.employees} employees  |  ${meta.startDate} to ${meta.planEnd}  |  Next EEA2/EEA4: ${meta.submissionDate}`), M, 116);
  doc.text(`Generated ${new Date().toISOString().slice(0, 10)}`, M, 132);
  y = 186;

  const ensure = (h: number) => { if (y + h > H - 60) { doc.addPage(); y = 56; } };
  const para = (text: string, opts: { size?: number; bold?: boolean; indent?: number; bullet?: string } = {}) => {
    const size = opts.size ?? 10.5; const ind = opts.indent ?? 0;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(strip(text), W - 2 * M - ind - (opts.bullet ? 14 : 0));
    lines.forEach((ln: string, i: number) => {
      ensure(size * 1.45);
      if (opts.bullet && i === 0) { doc.setTextColor(...TEAL); doc.text(opts.bullet, M + ind, y); doc.setTextColor(...INK); }
      doc.text(ln, M + ind + (opts.bullet ? 14 : 0), y);
      y += size * 1.45;
    });
    y += 3;
  };

  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]; const t = raw.trim();
    if (!t) { y += 4; continue; }
    if (/^#{1,3}\s/.test(t)) {
      ensure(48); y += 10;
      doc.setFont("times", "bold"); doc.setFontSize(16); doc.setTextColor(...PRIMARY);
      doc.text(strip(t.replace(/^#+\s*/, "")), M, y);
      doc.setDrawColor(...LINE); doc.setLineWidth(0.8); doc.line(M, y + 6, W - M, y + 6);
      y += 22; continue;
    }
    if (t.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const r = lines[i].trim();
        if (!/^\|[\s:|-]+\|$/.test(r)) rows.push(r.replace(/^\||\|$/g, "").split("|").map(strip));
        i++;
      }
      i--;
      if (rows.length) {
        autoTable(doc, {
          startY: y, head: [rows[0]], body: rows.slice(1), margin: { left: M, right: M },
          styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, textColor: INK, lineColor: LINE, lineWidth: 0.5, valign: "top" },
          headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [244, 247, 251] },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
      }
      continue;
    }
    const ind = Math.min(raw.search(/\S/), 8) * 3;
    const num = t.match(/^(\d+)[.)]\s+(.*)/);
    if (num) { para(num[2], { bullet: `${num[1]}.`, indent: ind }); continue; }
    if (/^[-*+]\s+/.test(t)) { para(t.replace(/^[-*+]\s+/, ""), { bullet: "\u2022", indent: ind }); continue; }
    para(t);
  }

  // Footer on every page
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE); doc.line(M, H - 40, W - M, H - 40);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text("Guidance only - not legal advice. Employment Equity Act 55 of 1998 (as amended).", M, H - 26);
    doc.text(`Page ${p} of ${n}`, W - M, H - 26, { align: "right" });
  }
  doc.save(`EE-implementation-plan-${meta.startDate || "draft"}.pdf`);
}
