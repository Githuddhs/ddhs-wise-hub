// Builds a branded invoice PDF for EFT settlement. Loaded on demand (browser only).
export type InvoicePdf = {
  number: string;
  issue_date: string;
  due_date: string;
  company: string;
  contact_name: string;
  billing_email: string;
  client_vat_ref: string;
  description: string;
  period_label: string;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  vat_number: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch_code: string;
  payfast_link: string;
};

// Brand colours mirror the Legislative glass tokens (PDF cannot read CSS variables).
const INK: [number, number, number] = [12, 23, 38];
const PRIMARY: [number, number, number] = [13, 99, 168];
const TEAL: [number, number, number] = [15, 148, 136];
const MUTED: [number, number, number] = [90, 104, 122];
const LINE: [number, number, number] = [214, 222, 234];

const clean = (s: string) =>
  s.replace(/[\u2010-\u2012]/g, "-").replace(/\u2192/g, "->").replace(/[^\x09\x0a\x0d\x20-\x7e\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026]/g, "");

export const zar = (n: number) => {
  const [i, d] = Math.abs(n).toFixed(2).split(".");
  return `${n < 0 ? "-" : ""}R ${i!.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}.${d}`;
};

export async function exportInvoicePdf(inv: InvoicePdf) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;

  // Header band
  doc.setFillColor(...PRIMARY); doc.rect(0, 0, W, 118, "F");
  doc.setFillColor(...TEAL); doc.rect(0, 118, W, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("DDHS EQUITY INTELLIGENCE", M, 42);
  doc.setFont("times", "bold"); doc.setFontSize(26); doc.text("Tax Invoice", M, 78);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(clean(`Invoice ${inv.number}${inv.vat_number ? `  |  VAT number ${inv.vat_number}` : ""}`), M, 100);

  // Dates, right aligned in the band
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(clean(`Invoice date: ${inv.issue_date}`), W - M, 42, { align: "right" });
  doc.text(clean(`Due by: ${inv.due_date}`), W - M, 58, { align: "right" });
  doc.text(clean(`Reference: ${inv.number}`), W - M, 74, { align: "right" });

  // Bill to
  let y = 156;
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text("BILL TO", M, y);
  y += 16;
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...INK);
  doc.text(clean(inv.company || "Client"), M, y);
  y += 15;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...MUTED);
  const billLines = [inv.contact_name, inv.billing_email, inv.client_vat_ref ? `VAT reference: ${inv.client_vat_ref}` : ""].filter(Boolean);
  for (const l of billLines) { doc.text(clean(l), M, y); y += 13; }

  // Line items
  y += 8;
  autoTable(doc, {
    startY: y,
    head: [["Description", "Period", "Amount (ex VAT)"]],
    body: [[clean(inv.description), clean(inv.period_label || "—"), zar(inv.amount)]],
    margin: { left: M, right: M },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 8, textColor: INK, lineColor: LINE, lineWidth: 0.5, valign: "top" },
    headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    columnStyles: { 2: { halign: "right", cellWidth: 120 } },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  // Totals
  const boxX = W - M - 240;
  const totals: [string, string][] = [
    ["Subtotal", zar(inv.amount)],
    [inv.vat_amount > 0 ? `VAT at ${inv.vat_rate}%` : "No VAT charged", zar(inv.vat_amount)],
    ["Total due", zar(inv.total)],
  ];
  totals.forEach(([label, value], i) => {
    const last = i === totals.length - 1;
    if (last) {
      doc.setFillColor(238, 245, 251);
      doc.rect(boxX - 10, y - 14, 250, 26, "F");
    }
    doc.setFont("helvetica", last ? "bold" : "normal"); doc.setFontSize(last ? 12 : 10);
    doc.setTextColor(...(last ? INK : MUTED));
    doc.text(label, boxX, y);
    doc.setTextColor(...INK);
    doc.text(value, W - M, y, { align: "right" });
    y += last ? 22 : 16;
  });

  // Banking details
  y += 12;
  const rows = [
    ["Pay by EFT into", inv.account_name],
    ["Bank", inv.bank_name],
    ["Account number", inv.account_number],
    ["Branch code", inv.branch_code],
    ["Use as reference", inv.number],
  ].filter((r) => r[1]);
  const boxH = 30 + rows.length * 15;
  if (y + boxH > H - 70) { doc.addPage(); y = 56; }
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...LINE); doc.setLineWidth(0.8);
  doc.roundedRect(M, y, W - 2 * M, boxH, 8, 8, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...TEAL);
  doc.text("PAYMENT DETAILS", M + 14, y + 20);
  let ry = y + 38;
  for (const [k, v] of rows) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
    doc.text(clean(k), M + 14, ry);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK);
    doc.text(clean(v), M + 150, ry);
    ry += 15;
  }
  y = y + boxH + 14;

  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
  const notes = doc.splitTextToSize(
    clean(
      `Please pay by EFT and quote ${inv.number} as your reference so we can match your payment.` +
        (inv.payfast_link ? " You can also settle this invoice online: " + inv.payfast_link : ""),
    ),
    W - 2 * M,
  );
  for (const l of notes as string[]) { doc.text(l, M, y); y += 12; }

  // Footer
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE); doc.line(M, H - 40, W - M, H - 40);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text("DDHS Equity Intelligence (Pty) Ltd", M, H - 26);
    doc.text(`Page ${p} of ${n}`, W - M, H - 26, { align: "right" });
  }
  doc.save(`Invoice-${inv.number}.pdf`);
}
