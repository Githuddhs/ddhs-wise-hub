// 5-year sectoral numerical targets under s15A of the EE Act, as determined in
// Government Notice 6124, Government Gazette 52514 (15 April 2025). Values are the % of
// each occupational level to be held by people from designated groups (excl. white males
// without disabilities and foreign nationals), so they are not meant to add up to 100%.
export type LevelTarget = { male: number; female: number; total: number };
export type SectorTarget = { name: string; top: LevelTarget; senior: LevelTarget; professional: LevelTarget; skilled: LevelTarget; disability: number };
export const GAZETTE_REF = "GN 6124, Government Gazette 52514, 15 April 2025";
export const LEVELS = [
  ["top", "Top management"], ["senior", "Senior management"],
  ["professional", "Professionally qualified & middle management"], ["skilled", "Skilled technical"],
] as const;
export const SECTOR_TARGETS: SectorTarget[] = [
 {
  "name": "Accommodation and Food Service Activities",
  "top": {
   "male": 18.6,
   "female": 38.1,
   "total": 56.7
  },
  "senior": {
   "male": 32.2,
   "female": 46.1,
   "total": 78.3
  },
  "professional": {
   "male": 38.6,
   "female": 46.1,
   "total": 84.7
  },
  "skilled": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "disability": 3.0
 },
 {
  "name": "Administrative and Support Activities",
  "top": {
   "male": 33.2,
   "female": 36.7,
   "total": 69.9
  },
  "senior": {
   "male": 42.3,
   "female": 43.5,
   "total": 85.8
  },
  "professional": {
   "male": 49.2,
   "female": 46.1,
   "total": 95.3
  },
  "skilled": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "disability": 3.0
 },
 {
  "name": "Agriculture, Forestry & Fishing",
  "top": {
   "male": 13.2,
   "female": 20.8,
   "total": 34.0
  },
  "senior": {
   "male": 21.6,
   "female": 31.0,
   "total": 52.6
  },
  "professional": {
   "male": 34.7,
   "female": 41.7,
   "total": 76.4
  },
  "skilled": {
   "male": 49.8,
   "female": 44.0,
   "total": 93.8
  },
  "disability": 3.0
 },
 {
  "name": "Arts, Entertainment and Recreation",
  "top": {
   "male": 35.1,
   "female": 33.5,
   "total": 68.6
  },
  "senior": {
   "male": 40.3,
   "female": 43.8,
   "total": 84.1
  },
  "professional": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "skilled": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "disability": 3.0
 },
 {
  "name": "Construction",
  "top": {
   "male": 30.0,
   "female": 24.8,
   "total": 54.8
  },
  "senior": {
   "male": 38.3,
   "female": 27.8,
   "total": 66.1
  },
  "professional": {
   "male": 46.7,
   "female": 34.4,
   "total": 81.1
  },
  "skilled": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "disability": 3.0
 },
 {
  "name": "Education",
  "top": {
   "male": 27.6,
   "female": 46.1,
   "total": 73.7
  },
  "senior": {
   "male": 30.5,
   "female": 46.1,
   "total": 76.6
  },
  "professional": {
   "male": 43.0,
   "female": 46.1,
   "total": 89.1
  },
  "skilled": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "disability": 3.0
 },
 {
  "name": "Electricity, Gas, Steam and Air Conditioning Supply",
  "top": {
   "male": 31.7,
   "female": 27.9,
   "total": 59.6
  },
  "senior": {
   "male": 42.7,
   "female": 39.5,
   "total": 82.2
  },
  "professional": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "skilled": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "disability": 3.0
 },
 {
  "name": "Financial and Insurance Activities",
  "top": {
   "male": 27.8,
   "female": 35.3,
   "total": 63.1
  },
  "senior": {
   "male": 31.7,
   "female": 45.3,
   "total": 77.0
  },
  "professional": {
   "male": 40.7,
   "female": 46.1,
   "total": 86.8
  },
  "skilled": {
   "male": 49.5,
   "female": 46.1,
   "total": 95.6
  },
  "disability": 3.0
 },
 {
  "name": "Human Health and Social Work Activities",
  "top": {
   "male": 27.6,
   "female": 43.7,
   "total": 71.3
  },
  "senior": {
   "male": 39.8,
   "female": 46.1,
   "total": 85.9
  },
  "professional": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "skilled": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "disability": 3.0
 },
 {
  "name": "Information and Communication",
  "top": {
   "male": 25.4,
   "female": 31.2,
   "total": 56.6
  },
  "senior": {
   "male": 28.6,
   "female": 40.0,
   "total": 68.6
  },
  "professional": {
   "male": 37.9,
   "female": 38.9,
   "total": 76.8
  },
  "skilled": {
   "male": 46.0,
   "female": 45.7,
   "total": 91.7
  },
  "disability": 3.0
 },
 {
  "name": "Manufacturing",
  "top": {
   "male": 24.1,
   "female": 25.0,
   "total": 49.1
  },
  "senior": {
   "male": 32.4,
   "female": 33.6,
   "total": 66.0
  },
  "professional": {
   "male": 40.4,
   "female": 37.7,
   "total": 78.1
  },
  "skilled": {
   "male": 49.8,
   "female": 39.6,
   "total": 89.4
  },
  "disability": 3.0
 },
 {
  "name": "Mining and Quarrying",
  "top": {
   "male": 33.1,
   "female": 24.4,
   "total": 57.5
  },
  "senior": {
   "male": 36.3,
   "female": 28.2,
   "total": 64.5
  },
  "professional": {
   "male": 43.2,
   "female": 34.4,
   "total": 77.6
  },
  "skilled": {
   "male": 49.8,
   "female": 36.9,
   "total": 86.7
  },
  "disability": 3.0
 },
 {
  "name": "Professional, Scientific and Technical Activities",
  "top": {
   "male": 24.4,
   "female": 38.1,
   "total": 62.5
  },
  "senior": {
   "male": 29.9,
   "female": 46.1,
   "total": 76.0
  },
  "professional": {
   "male": 35.9,
   "female": 46.1,
   "total": 82.0
  },
  "skilled": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "disability": 3.0
 },
 {
  "name": "Public Administration and Defence; Compulsory Social Security",
  "top": {
   "male": 49.8,
   "female": 41.9,
   "total": 91.7
  },
  "senior": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "professional": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "skilled": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "disability": 3.0
 },
 {
  "name": "Real Estate Activities",
  "top": {
   "male": 18.9,
   "female": 30.3,
   "total": 49.2
  },
  "senior": {
   "male": 22.9,
   "female": 46.1,
   "total": 69.0
  },
  "professional": {
   "male": 32.4,
   "female": 46.1,
   "total": 78.5
  },
  "skilled": {
   "male": 38.3,
   "female": 46.1,
   "total": 84.4
  },
  "disability": 3.0
 },
 {
  "name": "Transportation and Storage",
  "top": {
   "male": 32.2,
   "female": 30.0,
   "total": 62.2
  },
  "senior": {
   "male": 42.1,
   "female": 35.9,
   "total": 78.0
  },
  "professional": {
   "male": 46.3,
   "female": 40.7,
   "total": 87.0
  },
  "skilled": {
   "male": 49.8,
   "female": 41.4,
   "total": 91.2
  },
  "disability": 3.0
 },
 {
  "name": "Water Supply, Sewerage, Waste Management and Remediation Activities",
  "top": {
   "male": 49.8,
   "female": 35.9,
   "total": 85.7
  },
  "senior": {
   "male": 49.8,
   "female": 41.0,
   "total": 90.8
  },
  "professional": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "skilled": {
   "male": 49.8,
   "female": 46.1,
   "total": 95.9
  },
  "disability": 3.0
 },
 {
  "name": "Wholesale and Retail Trade; Repair of Motor Vehicles and Motorcycles",
  "top": {
   "male": 24.2,
   "female": 27.5,
   "total": 51.7
  },
  "senior": {
   "male": 35.0,
   "female": 38.6,
   "total": 73.6
  },
  "professional": {
   "male": 42.2,
   "female": 46.1,
   "total": 88.3
  },
  "skilled": {
   "male": 48.1,
   "female": 46.1,
   "total": 94.2
  },
  "disability": 3.0
 }
];
export const SECTOR_NAMES = SECTOR_TARGETS.map((s) => s.name);
export function findSector(name: string) { return SECTOR_TARGETS.find((s) => s.name === name); }
export function targetsText(name: string): string {
  const s = findSector(name);
  if (!s) return "No gazetted s15A sector matched; ask the employer to confirm its SIC sector.";
  const lines = LEVELS.map(([k, l]) => `- ${l}: ${s[k].total}% designated groups (male ${s[k].male}%, female ${s[k].female}%)`);
  return `Official 5-year s15A sectoral numerical targets for ${s.name} (${GAZETTE_REF}):\n${lines.join("\n")}\n- People with disabilities: ${s.disability}% of the workforce\nTargets exclude white males without disabilities and foreign nationals. Use these exact figures; do not invent others. An employer is not penalised if it shows reasonable grounds for not meeting them.`;
}
