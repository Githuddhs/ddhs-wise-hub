# MVP scope: five core modules

The app currently stores workforce **totals** per job level. The MVP moves to a proper **employee master record** and builds the five modules on that data. Existing tools (AI assessment, planner, review, committee, calendar, dashboard) stay and get connected to it.

## 1. Workforce data (/workforce)
- Import an Excel/CSV file of employees, with a downloadable template. Columns: employee no., job level, race, gender, disability, foreign national, start date, end date, movement type (hire, promotion, termination), department.
- Column-matching step, preview, then import. Re-importing replaces or merges by employee no.
- Employee table with search, filter, and edit/add/delete on each row.
- Data checks with a quality score: missing required fields, invalid codes, duplicate employee nos., end date before start date, totals per level that don't match.
- POPIA: no names or ID numbers are stored, only employee no. and EE fields. Each organisation's data is visible only to its owner.

## 2. EEA12 workforce analysis (/analysis)
- Breakdown tables in EEA2 form layout: job level × race × gender (M/F), foreign nationals, and disability.
- Movement analysis for a chosen reporting period: hires, promotions and terminations per group.
- Representation compared with the sector targets from the Gazette (already built in) and with population figures, with the gap shown per level.
- Export as Excel. An optional "Explain gaps" AI summary is saved to the evidence repository.

## 3. EEA13 implementation plan (/ee-plan)
- Structured plan with these sections: barriers (category, description, affected groups), numerical goals per level/group per year, annual objectives, and affirmative action measures.
- Each measure has an owner, milestones and due dates. These feed the compliance calendar and the daily reminder emails.
- Numerical goals are pre-filled from the gaps found in the EEA12 analysis.
- Exports: the existing PDF, plus the Word EE plan builder pre-filled from the structured plan.

## 4. Evidence & governance repository (/evidence)
- Upload documents (PDF, Word, Excel, images) to private file storage, with categories: consultation, committee minutes, policies, barriers analysis, submissions, training, other.
- Version history: uploading a new version keeps the older ones downloadable.
- Decision log: date, decision, made by, linked meeting.
- Link evidence to plan measures, committee actions and decisions. The record shows which items have no evidence attached.
- Activity trail: who changed what and when.

## 5. Executive dashboard (existing /dashboard, upgraded)
- Reads live employee data instead of typed totals: progress against targets and goals per level.
- Overdue and due-soon actions, data-quality status, the compliance calendar countdown, and a governance summary (meetings held, decisions recorded, evidence coverage %).
- The old manual totals grid is replaced by the link to workforce data. The upload-totals option stays only as a fallback.

## Out of scope for this MVP
Multiple users per organisation or roles, payroll/HR system integrations, direct submission to the Department of Employment and Labour, and income differential (EEA4) analysis.

## Technical details
- New tables, all owner-only RLS with grants: employees, import_batches, ee_plans, plan_barriers, plan_goals, plan_measures (owner, due_date, status, reminded_on), evidence_items, evidence_versions, evidence_links, decisions, audit_log (written by triggers).
- A private storage bucket `evidence` with paths `{user_id}/...` and owner-only storage policies.
- Analysis runs in the browser through a shared `src/lib/eea12.ts` (pure functions) used by the analysis page and the dashboard. xlsx is already installed for import and export.
- The reminder route also includes overdue/due plan measures in the daily digest.
- New pages go under `_authenticated/`, linked in the nav. The nav is grouped into Data · Plan · Governance · AI tools so it stays usable on mobile.
- Delivered in this order: 1, then 2, then 3, then 4, then 5. Each step is checked signed in, using a sample employee file.
