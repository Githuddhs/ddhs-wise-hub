import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  assessment: z.string().min(20).max(12000),
  sector: z.string().max(120),
  employees: z.number().int().min(1).max(1_000_000),
  startDate: z.string().max(20),
  submissionDate: z.string().max(20),
  planEnd: z.string().max(20),
  priorities: z.string().max(2000),
});

const SYSTEM = `You are a senior South African Employment Equity implementation advisor.
Ground the plan in the Employment Equity Act 55 of 1998 as amended (Amendment Act 4 of 2022: s15A sector targets), EE Regulations, Code of Good Practice on EE plans, and forms EEA1, EEA2, EEA4, EEA12, EEA13, s53 compliance certificate. Statutory EEA2/EEA4 reporting is due annually by 15 January (online).
Using the assessment results and dates provided, produce a PRIORITISED implementation plan with dated milestones that all fall between the start date and the plan end date, and statutory items scheduled before the submission date. Do not invent facts; note assumptions.
Respond in Markdown with exactly these sections:
## Plan overview
(2-4 sentences: horizon, governance, critical path)
## Priorities
Numbered, highest first. Each: **Priority** — Urgency: Critical/High/Medium · Reference: (section) — why.
## Milestones
A Markdown table with columns: # | Milestone | Target date (YYYY-MM-DD) | Owner | Evidence | Reference. Sorted by date, 8-14 rows.
## Phases
Short bullets grouping milestones into phases.
## Risks & monitoring
3-5 bullets with early-warning indicators.
End with a one-line note that this is guidance, not legal advice. Keep under 900 words.`;

export const Route = createFileRoute("/api/plan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let input: z.infer<typeof schema>;
        try {
          input = schema.parse(await request.json());
        } catch {
          return Response.json({ error: "Please check the form fields and try again." }, { status: 400 });
        }
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return Response.json({ error: "AI is not configured." }, { status: 500 });

        const { createOpenAI } = await import("@ai-sdk/openai");
        const { streamText } = await import("ai");

        let runId: string | undefined;
        let upstreamStatus = 0;
        const openai = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: async (i, init) => {
            const h = new Headers(init?.headers);
            if (runId) h.set("X-Lovable-AIG-Run-ID", runId);
            const res = await fetch(i, { ...init, headers: h });
            runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
            upstreamStatus = res.status;
            return res;
          },
        });

        const prompt = `Assessment results and planning inputs (JSON):\n${JSON.stringify(input, null, 2)}`;
        const result = streamText({
          model: openai.responses("openai/gpt-6-astra"),
          system: SYSTEM,
          prompt,
          maxRetries: 0,
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        const enc = new TextEncoder();
        const send = (c: ReadableStreamDefaultController, o: unknown) =>
          c.enqueue(enc.encode(JSON.stringify(o) + "\n"));
        const msgFor = (s: number) =>
          s === 402
            ? "AI credits have run out for this workspace. Add credits in Settings → Plans & credits."
            : s === 403
              ? "The AI service declined this request."
              : s === 429
                ? "Too many requests right now — please wait a minute and try again."
                : "The AI service is temporarily unavailable. Please try again shortly.";

        const stream = new ReadableStream({
          async start(c) {
            try {
              for await (const part of result.fullStream) {
                if (part.type === "text-delta") send(c, { t: part.text });
                else if (part.type === "error") {
                  send(c, { error: msgFor(upstreamStatus) });
                  break;
                } else if (part.type === "finish" && part.finishReason === "content-filter") {
                  send(c, { error: "The AI declined to answer this request." });
                }
              }
            } catch {
              if (!request.signal.aborted) send(c, { error: msgFor(upstreamStatus) });
            }
            c.close();
          },
        });
        return new Response(stream, {
          headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache, no-transform" },
        });
      },
    },
  },
});
