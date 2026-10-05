import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";

const milestone = z.object({
  name: z.string().min(2).max(200),
  originalDate: z.string().max(20),
  revisedDate: z.string().max(20),
  status: z.enum(["Not started", "On track", "At risk", "Delayed", "Complete"]),
  progress: z.number().int().min(0).max(100),
  blockers: z.string().max(1500),
});
const schema = z.object({
  reportDate: z.string().max(20),
  submissionDate: z.string().max(20),
  context: z.string().max(6000),
  milestones: z.array(milestone).min(1).max(25),
});

const SYSTEM = `You are a senior South African Employment Equity programme delivery advisor.
Ground advice in the Employment Equity Act 55 of 1998 as amended (incl. s15A sector targets, s16-17 consultation, s20 EE plan, s21 annual EEA2/EEA4 reporting due by 15 January, s24 assigned senior manager, s36-37 DEL inspections, s53 compliance certificates).
You receive milestone progress updates, blockers and revised target dates. Compare revised vs original dates and the report date; slippage that pushes statutory items past the submission date is Critical. Do not invent facts; state assumptions.
Respond in Markdown with exactly these sections:
## Delivery status
One line: **Overall: Green / Amber / Red** — then 2-3 sentences.
## Delivery risks
A Markdown table: Risk | Milestone | Severity (Critical/High/Medium/Low) | Slippage (days) | Compliance exposure (section). Most severe first.
## Recovery actions
Numbered, highest priority first. Each: **Action** — Owner · Due YYYY-MM-DD · Resolves: (risk) — one line on how.
## Revised date check
Bullets flagging revised dates that are unrealistic or breach statutory deadlines, with a suggested date.
## Escalate to the s24 senior manager / EE committee
2-4 bullets.
End with a one-line note that this is guidance, not legal advice. Keep under 850 words.`;

export const Route = createFileRoute("/api/progress")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await requireUser(request);
        if (denied) return denied;
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

        const prompt = `Progress report (JSON):\n${JSON.stringify(input, null, 2)}`;
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
