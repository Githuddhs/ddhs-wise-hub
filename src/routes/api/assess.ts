import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  sector: z.string().max(120),
  province: z.string().max(60),
  employees: z.number().int().min(1).max(1_000_000),
  designated: z.boolean(),
  levels: z.record(z.string().max(40), z.string().max(200)),
  demographics: z.string().max(3000),
  planPeriod: z.string().max(100),
  eea2: z.string().max(20),
  committee: z.string().max(20),
  sectorTargets: z.string().max(20),
  barriers: z.string().max(20),
  planNotes: z.string().max(5000),
});

const SYSTEM = `You are a senior South African Employment Equity compliance advisor.
Ground every point in the Employment Equity Act 55 of 1998 as amended (incl. the Employment Equity Amendment Act 4 of 2022, effective 1 January 2025: s15A sector numerical targets, designated-employer threshold based on 50+ employees only), the EE Regulations, Code of Good Practice on EE plans, and EEA forms (EEA1, EEA2, EEA4, EEA12, EEA13, EEA5 compliance certificate under s53).
Given an organisation's profile, identify LIKELY compliance gaps and practical next steps. Be specific and concise. Do not invent facts; note assumptions.
Respond in Markdown with exactly these sections:
## Readiness summary
(2-4 sentences, plus an overall rating: Low / Moderate / High readiness)
## Likely gaps
For each gap: **Gap title** — Severity: High/Medium/Low · Reference: (e.g. s19, s20, s21, s15A, s16) — one or two sentences why.
## Next steps
Numbered list; each with owner (e.g. HR Director, EE Committee, Senior Manager s24) and timeframe.
End with a one-line note that this is guidance, not legal advice. Keep the whole answer under 700 words.`;

export const Route = createFileRoute("/api/assess")({
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

        const prompt = `Organisation profile (JSON):\n${JSON.stringify(input, null, 2)}`;
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
