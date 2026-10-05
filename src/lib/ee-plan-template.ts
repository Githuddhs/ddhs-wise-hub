// Section 20 EE Plan structure shared by the builder page and the Word export.
export type Field = { key: string; label: string; hint?: string; long?: boolean };
export type Section = { title: string; ref: string; intro: string; fields: Field[] };

export const LEVELS = [
  "Top management",
  "Senior management",
  "Professionally qualified & mid-management",
  "Skilled technical & junior management",
  "Semi-skilled & discretionary decision-making",
  "Unskilled & defined decision-making",
] as const;

export type Goal = { current: string; target: string; disability: string };

export const SECTIONS: Section[] = [
  {
    title: "Employer details", ref: "s20(1); EEA13", intro: "This Employment Equity Plan is prepared by the designated employer named below in terms of section 20 of the Employment Equity Act 55 of 1998, as amended.",
    fields: [
      { key: "employer", label: "Registered employer name" },
      { key: "tradingName", label: "Trading name" },
      { key: "dolRef", label: "DEL / EE reference number" },
      { key: "sector", label: "Economic sector (s15A)" },
      { key: "address", label: "Physical address" },
      { key: "employees", label: "Total number of employees" },
    ],
  },
  {
    title: "Duration of the plan", ref: "s20(2)(e)", intro: "The plan shall run for the period below, which is not shorter than one year and not longer than five years.",
    fields: [
      { key: "startDate", label: "Start date" },
      { key: "endDate", label: "End date" },
    ],
  },
  {
    title: "Objectives", ref: "s20(2)(a)", intro: "The objectives to be achieved for each year of the plan are:",
    fields: [{ key: "objectives", label: "Annual objectives", long: true, hint: "Year 1: …  Year 2: …" }],
  },
  {
    title: "Barriers identified in the analysis", ref: "s19", intro: "The analysis of employment policies, practices, procedures and the working environment identified the following barriers:",
    fields: [{ key: "barriers", label: "Barriers", long: true }],
  },
  {
    title: "Affirmative action measures", ref: "s15; s20(2)(b)", intro: "The following affirmative action measures, including reasonable accommodation, will be implemented:",
    fields: [{ key: "measures", label: "Measures", long: true }],
  },
  {
    title: "Numerical goals", ref: "s20(2)(c); s15A", intro: "Where under-representation has been identified, the following numerical goals for designated groups apply by the end of the plan. Goals are flexible targets, not quotas.",
    fields: [],
  },
  {
    title: "Timetable and strategies", ref: "s20(2)(d)", intro: "The timetable for each year of the plan for achieving goals and objectives other than numerical goals, and the strategies to achieve them:",
    fields: [{ key: "timetable", label: "Timetable and strategies", long: true }],
  },
  {
    title: "Monitoring and evaluation", ref: "s20(2)(f)", intro: "Implementation will be monitored and evaluated as follows, including whether reasonable progress is being made:",
    fields: [{ key: "monitoring", label: "Procedures", long: true }],
  },
  {
    title: "Internal dispute resolution", ref: "s20(2)(g)", intro: "Disputes about the interpretation or implementation of this plan will be resolved through:",
    fields: [{ key: "disputes", label: "Procedure", long: true }],
  },
  {
    title: "Responsible persons", ref: "s20(2)(h); s24", intro: "The following persons are responsible for monitoring and implementing the plan:",
    fields: [
      { key: "seniorManager", label: "Assigned senior manager (s24)" },
      { key: "eeManager", label: "EE manager / practitioner" },
      { key: "committee", label: "Consultative / EE committee members", long: true },
    ],
  },
  {
    title: "Consultation and approval", ref: "s16–17", intro: "This plan was developed in consultation with employees and representative trade unions and is approved by the CEO.",
    fields: [
      { key: "consultDates", label: "Consultation dates" },
      { key: "ceo", label: "CEO name" },
      { key: "approvalDate", label: "Approval date" },
    ],
  },
];
