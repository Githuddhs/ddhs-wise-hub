// Employee master record helpers: validation, EEA12-style analysis and import mapping.
// Pure functions, shared by the workforce, analysis, plan and dashboard pages.
import { findSector } from "@/lib/sector-targets";

export const ALL_LEVELS = [
  ["top", "Top management"],
  ["senior", "Senior management"],
  ["professional", "Professionally qualified & middle management"],
  ["skilled", "Skilled technical & junior management"],
  ["semi", "Semi-skilled & discretionary decision-making"],
  ["unskilled", "Unskilled & defined decision-making"],
] as const;
export type Level = (typeof ALL_LEVELS)[number][0];
export const LEVEL_LABEL = Object.fromEntries(ALL_LEVELS) as Record<Level, string>;
export const TARGET_LEVELS: Level[] = ["top", "senior", "professional", "skilled"];

export const COLS = ["AM", "CM", "IM", "WM", "AF", "CF", "IF", "WF", "FNM", "FNF"] as const;
export type Col = (typeof COLS)[number];
export const COL_LABEL: Record<Col, string> = { AM: "African M", CM: "Coloured M", IM: "Indian M", WM: "White M", AF: "African F", CF: "Coloured F", IF: "Indian F", WF: "White F", FNM: "Foreign M", FNF: "Foreign F" };

// Approximate national economically active population (QLFS). Indicative only — check the latest QLFS.
export const EAP: Record<Exclude<Col, "FNM" | "FNF">, number> = { AM: 43.6, CM: 5.0, IM: 1.5, WM: 4.6, AF: 35.6, CF: 4.6, IF: 1.0, WF: 4.1 };

export type Employee = {
  id?: string;
  employee_no: string;
  level: string | null;
  race: string | null;
  gender: string | null;
  disability: boolean;
  foreign_national: boolean;
  department: string | null;
  start_date: string | null;
  end_date: string | null;
  promoted_on: string | null;
};

export const colOf = (e: Employee): Col | null => {
  if (e.gender !== "M" && e.gender !== "F") return null;
  if (e.foreign_national) return e.gender === "M" ? "FNM" : "FNF";
  if (!e.race || !"ACIW".includes(e.race)) return null;
  return `${e.race}${e.gender}` as Col;
};

export const activeOn = (e: Employee, iso: string) => (!e.start_date || e.start_date <= iso) && (!e.end_date || e.end_date > iso);
const inPeriod = (d: string | null, from: string, to: string) => !!d && d >= from && d <= to;

export type Grid = Record<Level, Record<Col, number>> ;
const emptyRow = () => Object.fromEntries(COLS.map((c) => [c, 0])) as Record<Col, number>;
const emptyGrid = () => Object.fromEntries(ALL_LEVELS.map(([l]) => [l, emptyRow()])) as Grid;

function tally(list: Employee[]): Grid {
  const g = emptyGrid();
  for (const e of list) { const c = colOf(e); if (c && e.level && e.level in g) g[e.level as Level][c]++; }
  return g;
}
export const rowTotal = (r: Record<Col, number>) => COLS.reduce((s, c) => s + r[c], 0);

/** EEA2-style workforce profile as at a date, plus disability and movements in a period. */
export function eea12(emps: Employee[], from: string, to: string) {
  const active = emps.filter((e) => activeOn(e, to));
  return {
    profile: tally(active),
    disability: tally(active.filter((e) => e.disability)),
    hires: tally(emps.filter((e) => inPeriod(e.start_date, from, to))),
    promotions: tally(emps.filter((e) => inPeriod(e.promoted_on, from, to))),
    terminations: tally(emps.filter((e) => inPeriod(e.end_date, from, to))),
    activeCount: active.length,
    disabilityCount: active.filter((e) => e.disability).length,
  };
}

export type Representation = { level: Level; total: number; male: number; female: number; designated: number; target?: { male: number; female: number; total: number } | undefined; gap: number | null };

/** Designated-group % per level vs the s15A sector target (designated = A/C/I men + all women, excl. foreign nationals). */
export function representation(profile: Grid, sector: string | null): { levels: Representation[]; disabilityTarget?: number | undefined } {
  const t = sector ? findSector(sector) : undefined;
  const levels = ALL_LEVELS.map(([level]) => {
    const r = profile[level];
    const total = rowTotal(r);
    const pct = (x: number) => (total ? Math.round((x / total) * 1000) / 10 : 0);
    const male = pct(r.AM + r.CM + r.IM), female = pct(r.AF + r.CF + r.IF + r.WF);
    const designated = Math.round((male + female) * 10) / 10;
    const target = t && (TARGET_LEVELS as string[]).includes(level) ? t[level as "top"] : undefined;
    return { level, total, male, female, designated, target, gap: target && total ? Math.round((designated - target.total) * 10) / 10 : null };
  });
  return { levels, disabilityTarget: t?.disability };
}

// ---------- Validation ----------
export type Issue = { employee_no: string; field: string; message: string; severity: "error" | "warning" };
const REQUIRED = ["level", "race", "gender", "start_date"] as const;

export function validate(emps: Employee[]): { issues: Issue[]; score: number; checked: number } {
  const issues: Issue[] = [];
  const seen = new Map<string, number>();
  for (const e of emps) seen.set(e.employee_no, (seen.get(e.employee_no) ?? 0) + 1);
  for (const e of emps) {
    const add = (field: string, message: string, severity: Issue["severity"] = "error") => issues.push({ employee_no: e.employee_no, field, message, severity });
    for (const f of REQUIRED) if (!e[f] && !(f === "race" && e.foreign_national)) add(f, `Missing ${f.replace("_", " ")}`);
    if (e.level && !(e.level in LEVEL_LABEL)) add("level", `Unknown job level "${e.level}"`);
    if (e.race && !"ACIW".includes(e.race)) add("race", `Unknown race code "${e.race}"`);
    if (e.gender && e.gender !== "M" && e.gender !== "F") add("gender", `Unknown gender "${e.gender}"`);
    if (e.start_date && e.end_date && e.end_date < e.start_date) add("end_date", "End date is before start date");
    if (e.promoted_on && e.start_date && e.promoted_on < e.start_date) add("promoted_on", "Promotion date is before start date", "warning");
    if (e.start_date && e.start_date > new Date().toISOString().slice(0, 10)) add("start_date", "Start date is in the future", "warning");
    if ((seen.get(e.employee_no) ?? 0) > 1) add("employee_no", "Duplicate employee number");
  }
  const bad = new Set(issues.filter((i) => i.severity === "error").map((i) => i.employee_no));
  return { issues, score: emps.length ? Math.round(((emps.length - bad.size) / emps.length) * 100) : 0, checked: emps.length };
}

// ---------- Import mapping ----------
export const FIELDS = [
  ["employee_no", "Employee no.", ["employee", "emp no", "emp_no", "staff", "number", "id"]],
  ["level", "Job level", ["level", "occupational", "grade", "band"]],
  ["race", "Race", ["race", "population"]],
  ["gender", "Gender", ["gender", "sex"]],
  ["disability", "Disability", ["disab", "pwd"]],
  ["foreign_national", "Foreign national", ["foreign", "national", "citizen"]],
  ["department", "Department", ["depart", "division", "unit", "business"]],
  ["start_date", "Start date", ["start", "hire", "engage", "join"]],
  ["end_date", "End date", ["end", "termin", "exit", "leave"]],
  ["promoted_on", "Promotion date", ["promot"]],
] as const;
export type FieldKey = (typeof FIELDS)[number][0];

export function guessMapping(headers: string[]): Partial<Record<FieldKey, number>> {
  const m: Partial<Record<FieldKey, number>> = {};
  const used = new Set<number>();
  for (const [key, , hints] of FIELDS) {
    const i = headers.findIndex((h, idx) => !used.has(idx) && hints.some((x) => h.toLowerCase().includes(x)));
    if (i >= 0) { m[key] = i; used.add(i); }
  }
  return m;
}

const yes = (v: string) => /^(y|yes|true|1|x)$/i.test(v.trim());
function normLevel(v: string): string | null {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  if (s in LEVEL_LABEL) return s;
  if (s.startsWith("top")) return "top";
  if (s.startsWith("senior")) return "senior";
  if (s.startsWith("prof") || s.includes("middle") || s.includes("mid")) return "professional";
  if (s.startsWith("semi")) return "semi";
  if (s.startsWith("unskilled")) return "unskilled";
  if (s.startsWith("skilled")) return "skilled";
  const n = parseInt(s, 10);
  if (n >= 1 && n <= 6) return ALL_LEVELS[n - 1]![0];
  return s;
}
function normRace(v: string): string | null {
  const s = v.trim().toUpperCase();
  if (!s) return null;
  if (s.startsWith("A") || s.startsWith("B")) return "A";
  if (s.startsWith("C")) return "C";
  if (s.startsWith("I")) return "I";
  if (s.startsWith("W")) return "W";
  return s.slice(0, 1);
}
function normGender(v: string): string | null {
  const s = v.trim().toUpperCase();
  if (!s) return null;
  return s.startsWith("M") ? "M" : s.startsWith("F") || s.startsWith("W") ? "F" : s.slice(0, 1);
}
function normDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") { const d = new Date(Math.round((v - 25569) * 86400000)); return d.toISOString().slice(0, 10); }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function mapRows(rows: unknown[][], mapping: Partial<Record<FieldKey, number>>): Employee[] {
  const get = (r: unknown[], k: FieldKey) => (mapping[k] === undefined ? "" : r[mapping[k]!]);
  const str = (r: unknown[], k: FieldKey) => String(get(r, k) ?? "").trim();
  return rows
    .filter((r) => str(r, "employee_no"))
    .map((r) => ({
      employee_no: str(r, "employee_no").slice(0, 40),
      level: normLevel(str(r, "level")),
      race: normRace(str(r, "race")),
      gender: normGender(str(r, "gender")),
      disability: yes(str(r, "disability")),
      foreign_national: yes(str(r, "foreign_national")),
      department: str(r, "department").slice(0, 100) || null,
      start_date: normDate(get(r, "start_date")),
      end_date: normDate(get(r, "end_date")),
      promoted_on: normDate(get(r, "promoted_on")),
    }));
}

export function employeeTemplateCsv() {
  return [
    "Employee no,Job level,Race,Gender,Disability,Foreign national,Department,Start date,End date,Promotion date",
    "E001,Top management,African,Female,No,No,Executive,2019-03-01,,",
    "E002,Skilled technical,Coloured,Male,Yes,No,Operations,2022-07-15,,2025-04-01",
  ].join("\n");
}
