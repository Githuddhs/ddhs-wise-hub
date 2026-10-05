import { targetsText } from "@/lib/sector-targets";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";

const schema = z.object({
  sector: z.string().max(120),
  period: z.string().max(60),
  pack: z.string().min(20).max(40000),
});

const SYSTEM = `You are reviewing an Employment Equity submission pack exactly as the Director-General's office would see it before the employer submits under section 21 of the Employment Equity Act 55 of 1998 as amended.
You receive the employer's own figures: workforce profile tables in EEA2/EEA12 layout, movements in the reporting period, representation against the gazetted s15A sector targets, the section 20 plan (barriers, numerical goals, annual objectives, measures with owners and due dates), the consultation record, evidence counts, and a pre-check list of what is present or missing.
Judge the pack only on what is given. Never invent figures, never assume a document exists, never state a legal conclusion — say what a reviewer would query.
Respond in Markdown with exactly these sections:
## Verdict
(First line: "Ready to submit" or "Not ready to submit", then the number of blocking gaps and the number of items to check.)
## Blocking gaps
(A bullet per item that would make this submission incomplete or inconsistent, naming the exact figure, field or document that is missing. Say "None." if there are none.)
## Inconsistencies a reviewer would query
(Bullets comparing figures across the tables given, quoting the figures. Say "None." if there are none.)
## Likely questions from the Department
(Bullets, each a question phrased the way a reviewer would ask it.)
## Fix before you submit
(Ordered list, most urgent first. Each item names what to fix and where in the workspace it is fixed.)
Keep under 800 words. End with a one-line note that this is guidance, not legal advice.`;

export const Route = createFileRoute("/api/dg-review")({
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

        const prompt = `${targetsText(input.sector)}\n\nReporting period: ${input.period}\n\nSubmission pack:\n${input.pack}`;
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
