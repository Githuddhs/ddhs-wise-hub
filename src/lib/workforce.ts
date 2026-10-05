import { LEVELS, findSector, type SectorTarget } from "@/lib/sector-targets";

export const GROUPS = [
  ["AM", "African M"], ["CM", "Coloured M"], ["IM", "Indian M"], ["WM", "White M"],
  ["AF", "African F"], ["CF", "Coloured F"], ["IF", "Indian F"], ["WF", "White F"],
  ["FNM", "Foreign M"], ["FNF", "Foreign F"], ["PWD", "With disability"],
] as const;
export type GroupKey = (typeof GROUPS)[number][0];
export type LevelKey = (typeof LEVELS)[number][0];
export type Counts = Partial<Record<LevelKey, Partial<Record<GroupKey, number>>>>;

const n = (v: number | undefined) => (Number.isFinite(v) ? Number(v) : 0);

export type LevelResult = { key: LevelKey; label: string; total: number; male: number; female: number; designated: number; target?: SectorTarget["top"] | undefined };

export function analyse(counts: Counts, sector: string | null) {
  const t = sector ? findSector(sector) : undefined;
  let all = 0, pwd = 0;
  const levels: LevelResult[] = LEVELS.map(([key, label]) => {
    const c = counts[key] ?? {};
    const total = (["AM", "CM", "IM", "WM", "AF", "CF", "IF", "WF", "FNM", "FNF"] as const).reduce((s, g) => s + n(c[g]), 0);
    const male = n(c.AM) + n(c.CM) + n(c.IM);
    const female = n(c.AF) + n(c.CF) + n(c.IF) + n(c.WF);
    all += total; pwd += n(c.PWD);
    const pct = (x: number) => (total ? Math.round((x / total) * 1000) / 10 : 0);
    return { key, label, total, male: pct(male), female: pct(female), designated: pct(male + female), target: t?.[key] };
  });
  return { levels, total: all, disability: all ? Math.round((pwd / all) * 1000) / 10 : 0, disabilityTarget: t?.disability };
}

/** Parses rows: level, AM, CM, IM, WM, AF, CF, IF, WF, FNM, FNF, PWD (header row optional). */
export function parseRows(rows: unknown[][]): Counts {
  const out: Counts = {};
  for (const r of rows) {
    const name = String(r[0] ?? "").toLowerCase();
    const lvl = LEVELS.find(([k, label]) => name.startsWith(k) || name.startsWith(label.toLowerCase().slice(0, 6)));
    if (!lvl) continue;
    const row: Partial<Record<GroupKey, number>> = {};
    GROUPS.forEach(([g], i) => { const v = parseInt(String(r[i + 1] ?? "0"), 10); row[g] = Number.isFinite(v) && v >= 0 ? v : 0; });
    out[lvl[0]] = row;
  }
  return out;
}

export function templateCsv() {
  return ["Level," + GROUPS.map((g) => g[0]).join(","), ...LEVELS.map(([, l]) => `"${l}"` + ",0".repeat(GROUPS.length))].join("\n");
}
