import { saveResult } from "@/lib/saved-results";
import { authFetch } from "@/lib/auth-fetch";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { SECTOR_NAMES } from "@/lib/sector-targets";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "EE Plan Compliance Review — DDHS Equity Intelligence" },
      { name: "description", content: "Upload your draft Employment Equity Plan and get AI feedback on Section 20 compliance, gaps and recommended fixes." },
      { property: "og:title", content: "EE Plan Compliance Review — DDHS Equity Intelligence" },
      { property: "og:description", content: "AI review of draft EE Plans against section 20 of the Employment Equity Act." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewPage,
});

const MAX = 60000;

function ReviewPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sector, setSector] = useState("");
  const [chars, setChars] = useState(0);
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [copied, setCopied] = useState(false);
  const ctrl = useRef<AbortController | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setErr("Choose your draft EE Plan file first.");
    if (file.size > 15 * 1024 * 1024) return setErr("That file is over 15 MB. Please upload a smaller copy.");
    setErr(""); setOut(""); setBusy(true); setStage("Reading your document…");
    const ac = new AbortController(); ctrl.current = ac;
    try {
      const { extractText } = await import("@/lib/extract-text");
      let text = (await extractText(file)).replace(/\s+\n/g, "\n").trim();
      if (text.length < 200) throw new Error("We couldn't read enough text from this file. If it's a scanned PDF, upload the Word version instead.");
      setChars(text.length);
      if (text.length > MAX) text = text.slice(0, MAX);
      setStage("Checking against Section 20…");
      const res = await authFetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, signal: ac.signal, body: JSON.stringify({ fileName: file.name.slice(0, 200), text, ...(sector ? { sector } : {}) }) });
      if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); throw new Error(j.error || "Something went wrong."); }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ""; let full = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) { void saveResult("review", full); break; }
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) { if (!l) continue; const m = JSON.parse(l); if (m.t) { full += m.t; setOut((o) => o + m.t); } if (m.error) setErr(m.error); }
      }
    } catch (x) {
      if ((x as Error).name !== "AbortError") setErr((x as Error).message);
    } finally { setBusy(false); setStage(""); ctrl.current = null; }
  }

  return (
    <div className="min-h-screen font-[Inter] antialiased">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-glass/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-baseline gap-2.5">
            <span className="font-[Fraunces] text-[19px] font-semibold tracking-tight">DDHS</span>
            <span className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.22em] text-muted">Equity Intelligence</span>
          </Link>
          <div className="flex items-center gap-5 text-[13px]">
            <Link to="/document" className="text-muted hover:text-foreground">EE Plan Builder</Link>
            <Link to="/plan" className="text-muted hover:text-foreground">Planner</Link>
            <Link to="/progress" className="text-muted hover:text-foreground">Progress</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-14">
        <p className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.2em] text-muted">AI-assisted · Section 20 review</p>
        <h1 className="mt-3 font-[Fraunces] text-[40px] font-medium leading-[1.05] tracking-tight lg:text-[52px]">EE Plan Compliance Review</h1>
        <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          Upload your draft EE Plan (Word, PDF or text). We'll check it against each Section 20 requirement and suggest fixes. Your file is read in your browser; only its text is sent for review and nothing is stored.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <form onSubmit={run} className="space-y-5 rounded-[20px] border border-line/60 bg-glass/60 p-6 backdrop-blur-2xl lg:self-start">
            <label htmlFor="file" className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line px-4 py-10 text-center hover:border-primary/60">
              <span className="font-[Fraunces] text-[18px]">{file ? file.name : "Choose your draft EE Plan"}</span>
              <span className="mt-1 text-[12px] text-muted">{file ? `${Math.round(file.size / 1024)} KB` : ".docx, .pdf, .txt — up to 15 MB"}</span>
              <input id="file" type="file" accept=".docx,.pdf,.txt,.md" className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setOut(""); setErr(""); }} />
            </label>
            <label className="block text-[13px]">
              <span className="font-[JetBrains_Mono] text-[11px] uppercase tracking-wider text-muted">Your sector (s15A targets)</span>
              <select value={sector} onChange={(e) => setSector(e.target.value)} className="mt-1.5 w-full rounded-lg border border-line/70 bg-panel/60 px-3 py-2.5">
                <option value="">Not sure / skip target check</option>
                {SECTOR_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            {chars > MAX && <p className="text-[12px] text-muted">Long document: only the first {MAX.toLocaleString()} characters were reviewed.</p>}
            <div className="flex gap-3">
              <button disabled={busy} className="rounded-full bg-primary px-6 py-3 text-[14px] font-medium text-primary-foreground disabled:opacity-60">{busy ? "Reviewing…" : "Review my plan"}</button>
              {busy && <button type="button" onClick={() => ctrl.current?.abort()} className="rounded-full border border-line/70 px-6 py-3 text-[14px]">Stop</button>}
            </div>
            <p className="text-[12px] text-muted">No draft yet? <Link to="/document" className="underline">Build one with the EE Plan Builder</Link>.</p>
          </form>

          <section aria-live="polite" className="rounded-[20px] border border-line/60 bg-panel/50 p-6 backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-[Fraunces] text-[22px]">Review</h2>
              {out && !busy && <button onClick={() => { navigator.clipboard.writeText(out); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="rounded-full border border-line/70 px-3 py-1 text-[12px]">{copied ? "Copied" : "Copy"}</button>}
            </div>
            {err && <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-[14px] text-destructive">{err}</p>}
            {!out && !err && <p className="mt-4 text-[14px] text-muted">{busy ? stage : "Your Section 20 review will appear here."}</p>}
            {out && (
              <div className="mt-4 space-y-3 overflow-x-auto text-[14px] leading-relaxed [&_h2]:mt-6 [&_h2]:font-[Fraunces] [&_h2]:text-[18px] [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc [&_strong]:font-semibold [&_table]:w-full [&_table]:text-[12.5px] [&_th]:border-b [&_th]:border-line [&_th]:p-1.5 [&_th]:text-left [&_td]:border-b [&_td]:border-line/50 [&_td]:p-1.5 [&_td]:align-top">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{out}</ReactMarkdown>
              </div>
            )}
            <p className="mt-6 border-t border-line/60 pt-3 text-[11px] text-muted">Guidance only — not legal advice.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
