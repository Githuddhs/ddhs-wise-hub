# EE Gap Assessment tool

A new page where HR / EE leaders describe their workforce and current EE plan, and get an AI-generated list of likely compliance gaps and practical next steps.

## What the user sees

- New page **"Gap Assessment"** at `/assess`, linked from the top navigation and a button on the home page.
- A guided form (same Legislative glass look):
  - Organisation: sector (dropdown of EE sectors), province, total employees, designated employer yes/no.
  - Workforce profile: free-text plus optional numbers by occupational level (Top / Senior / Professional / Skilled / Semi-skilled / Unskilled) and race/gender/disability notes.
  - Current EE plan: plan period, whether EEA2/EEA4 reports were submitted, EE committee in place, sector targets known, barriers analysis done, free-text description.
- "Analyse" button streams the result in as it is written:
  - Overall readiness summary
  - Likely gaps, each with severity (High / Medium / Low) and the relevant EE Act reference (e.g. s15, s19, s20, s21, s15A sector targets)
  - Practical next steps, ordered, with suggested owner and timeframe
- Clear disclaimer: guidance only, not legal advice; no data is stored.
- Friendly messages for out-of-credits, rate-limit, or refusal cases; a Stop button while it runs.

## Technical details

- Add `LOVABLE_API_KEY` if missing; install `ai` and `@ai-sdk/openai`.
- Server route `src/routes/api/assess.ts` (POST, streaming) validating input with Zod, using `createOpenAI(...).responses("openai/gpt-6-astra")` via the Lovable AI Gateway with `streamText`, the standard reasoning/`store: false` options, and run-id fetch helper. System prompt grounds the model in the SA Employment Equity Act (incl. 2023 amendments, sector targets) and asks for a Markdown structure with headings for Summary / Gaps / Next steps.
- Gateway errors mapped per status (402, 403, 429, 5xx) to safe messages; abort propagates as 499.
- Client page `src/routes/assess.tsx` with its own head() metadata, renders streamed Markdown (`react-markdown`), uses existing design tokens only.
- No database: nothing is saved (keeps POPIA exposure minimal).
- Verify with a live test call and a browser run of the form.
