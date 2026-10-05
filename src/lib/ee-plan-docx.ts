// Builds an editable Word (.docx) EE Plan. Loaded on demand in the browser.
import { LEVELS, SECTIONS, type Goal } from "./ee-plan-template";

const BLUE = "0D63A8";
const MUTE = "5A687A";

export async function exportEePlanDocx(v: Record<string, string>, goals: Goal[]) {
  const d = await import("docx");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType, Footer, PageNumber } = d;

  const val = (k: string, label: string) =>
    v[k]?.trim() ? new TextRun({ text: v[k].trim() }) : new TextRun({ text: `[${label}]`, highlight: "yellow" });
  const multi = (k: string, label: string) =>
    (v[k]?.trim() ? v[k].trim().split("\n") : [`[${label}]`]).map((ln) =>
      new Paragraph({ spacing: { after: 80 }, children: [v[k]?.trim() ? new TextRun(ln) : new TextRun({ text: ln, highlight: "yellow" })] }));

  const cell = (text: string, head = false) =>
    new TableCell({
      ...(head ? { shading: { type: ShadingType.CLEAR, color: "auto", fill: BLUE } } : {}),
      children: [new Paragraph({ children: [new TextRun({ text, bold: head, ...(head ? { color: "FFFFFF" } : {}), size: 18 })] })],
    });

  const body: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [
    new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: "EMPLOYMENT EQUITY PLAN", bold: true, size: 40, color: BLUE, font: "Georgia" })] }),
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: v["employer"]?.trim() || "[Registered employer name]", size: 28, ...(v["employer"]?.trim() ? {} : { highlight: "yellow" as const }) })] }),
    new Paragraph({ spacing: { after: 360 }, children: [new TextRun({ text: "Prepared in terms of section 20 of the Employment Equity Act 55 of 1998, as amended", italics: true, color: MUTE, size: 20 })] }),
  ];

  SECTIONS.forEach((s, i) => {
    body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 80 }, children: [new TextRun({ text: `${i + 1}. ${s.title}`, color: BLUE, font: "Georgia", size: 28 })] }));
    body.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: s.ref, color: MUTE, size: 16 })] }));
    body.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun(s.intro)] }));
    if (s.title === "Numerical goals") {
      body.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ tableHeader: true, children: ["Occupational level", "Current designated %", "Target designated %", "Target PWD %"].map((t) => cell(t, true)) }),
          ...LEVELS.map((l, j) => new TableRow({ children: [cell(l), cell(goals[j]?.current || "[  ]"), cell(goals[j]?.target || "[  ]"), cell(goals[j]?.disability || "[  ]")] })),
        ],
      }));
      return;
    }
    s.fields.forEach((f) => {
      if (f.long) {
        if (s.fields.length > 1) body.push(new Paragraph({ children: [new TextRun({ text: f.label, bold: true })] }));
        body.push(...multi(f.key, f.label));
      } else {
        body.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `${f.label}: `, bold: true }), val(f.key, f.label)] }));
      }
    });
  });

  body.push(new Paragraph({ spacing: { before: 600 }, children: [new TextRun("______________________________          ______________________________")] }));
  body.push(new Paragraph({ children: [new TextRun({ text: "Chief Executive Officer                                         Assigned Senior Manager (s24)", color: MUTE, size: 18 })] }));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 21 } } } },
    sections: [{
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "EE Plan · Page ", size: 16, color: MUTE }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTE })] })] }) },
      children: body,
    }],
  });
  const blob = await Packer.toBlob(doc);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `EE-Plan-${(v["employer"] || "draft").replace(/[^\w-]+/g, "-")}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
