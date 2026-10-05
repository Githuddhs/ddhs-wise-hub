import { targetsText } from "@/lib/sector-targets";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";

const schema = z.object({
  sector: z.string().max(120),
  analysis: z.string().min(20).max(20000),
});

const SYSTEM = `You are a South African Employment Equity analyst preparing an EEA12-style workforce analysis narrative.
Use the Employment Equity Act 55 of 1998 as amended (s19 analysis, s15A sector targets), and the EEA12 form structure.
You receive workforce profile tables, movement counts and representation vs the gazetted sector targets. Explain the findings. Do not invent numbers; only use the figures given.
Respond in Markdown with these sections:
## Key findings
## Under-representation by level
(a bullet per level with the gap in points vs target, naming the groups most under-represented)
## Movement patterns
(hires, promotions, terminations — what they suggest about barriers)
## Suggested numerical goals
(realistic per-level goals for the plan period)
## Questions for the barriers analysis
End with a one-line note that this is guidance, not legal advice. Keep under 700 words.`;

export const Route = createFileRoute("/api/explain-gaps")({
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

        const prompt = `${targetsText(input.sector)}\n\nWorkforce analysis:\n${input.analysis}`;
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
