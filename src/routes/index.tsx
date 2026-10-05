import { createFileRoute } from "@tanstack/react-router";
import glassPanels from "@/assets/glass-panels.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DDHS Equity Intelligence — Employment Equity Compliance" },
      {
        name: "description",
        content:
          "AI-assisted Employment Equity compliance, workforce transformation and governance for South African designated employers.",
      },
      { property: "og:title", content: "DDHS Equity Intelligence — Employment Equity Compliance" },
      {
        property: "og:description",
        content:
          "AI-assisted EE reporting, workforce analytics and governance dashboards built for the Employment Equity Act.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen font-[Inter] antialiased">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-glass/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-3.5">
          <div className="flex items-baseline gap-2.5">
            <span className="font-[Fraunces] text-[19px] font-semibold tracking-tight">DDHS</span>
            <span className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.22em] text-muted">
              Equity Intelligence
            </span>
          </div>
          <nav className="hidden items-center gap-7 text-[13px] text-muted md:flex">
            <a href="#capabilities" className="transition-colors hover:text-foreground">
              Capabilities
            </a>
            <a href="#trust" className="transition-colors hover:text-foreground">
              Trust
            </a>
            <a href="#demo" className="transition-colors hover:text-foreground">
              Contact
            </a>
          </nav>
          <a
            href="#demo"
            className="rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground ring-1 ring-black/5 transition-colors hover:bg-primary/90"
          >
            Request a demo
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-20 lg:grid-cols-[1.02fr_1fr]">
          <div>
            <p className="clip mb-6 inline-flex items-center gap-2 rounded-full border border-line/70 bg-glass/60 px-3 py-1 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.2em] text-muted backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-accent"></span>
              Employment Equity Act · Republic of South Africa
            </p>
            <h1 className="rise text-balance font-[Fraunces] text-[46px] font-medium leading-[1.04] tracking-tight text-pretty [font-optical-sizing:auto] lg:text-[62px]">
              Equity, <span className="font-light italic">measured</span> with the rigour the Act
              deserves.
            </h1>
            <p className="rise mt-6 max-w-[46ch] text-[16px] leading-relaxed text-muted text-pretty [animation-delay:120ms]">
              DDHS is the AI-assisted compliance layer for workforce transformation — turning EE
              reporting, B-BBEE-adjacent analytics and board governance into one auditable,
              defensible record.
            </p>
            <div className="rise mt-8 flex flex-wrap items-center gap-3 [animation-delay:200ms]">
              <a
                href="#demo"
                className="rounded-full bg-primary px-6 py-3 text-[14px] font-medium text-primary-foreground ring-1 ring-black/5 transition-colors hover:bg-primary/90"
              >
                Request a demo
              </a>
              <a
                href="#capabilities"
                className="rounded-full border border-line/70 bg-glass/50 px-6 py-3 text-[14px] font-medium backdrop-blur-md transition-colors hover:bg-glass/80"
              >
                See the platform
              </a>
            </div>
            <div className="rise mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-[min(1vw,14px)] border border-line/60 bg-line/60 backdrop-blur-md [animation-delay:280ms]">
              <div className="bg-glass/70 px-4 py-4">
                <div className="font-[JetBrains_Mono] text-[22px] font-medium tabular-nums">4,200+</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted">
                  EE submissions filed
                </div>
              </div>
              <div className="bg-glass/70 px-4 py-4">
                <div className="font-[JetBrains_Mono] text-[22px] font-medium tabular-nums">99.2%</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted">
                  First-pass acceptance
                </div>
              </div>
              <div className="bg-glass/70 px-4 py-4">
                <div className="font-[JetBrains_Mono] text-[22px] font-medium tabular-nums">2013</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted">
                  Amended Act aligned
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rise rounded-[min(1.5vw,22px)] border border-line/60 bg-glass/60 p-5 shadow-[0_28px_60px_-30px_rgba(12,23,38,0.35)] ring-1 ring-black/5 backdrop-blur-2xl [animation-delay:160ms]">
              <div className="flex items-center justify-between">
                <div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.18em] text-muted">
                  Workforce representation · EEA9
                </div>
                <div className="font-[JetBrains_Mono] text-[10px] text-accent">Q3 · live</div>
              </div>
              <div className="mt-5 flex items-end gap-2.5">
                <div className="flex h-[150px] flex-1 flex-col justify-end">
                  <div className="bar h-[42%] rounded-t-[6px] bg-primary/85"></div>
                </div>
                <div className="flex h-[150px] flex-1 flex-col justify-end">
                  <div className="bar h-[58%] rounded-t-[6px] bg-primary/85 [animation-delay:600ms]"></div>
                </div>
                <div className="flex h-[150px] flex-1 flex-col justify-end">
                  <div className="bar h-[74%] rounded-t-[6px] bg-primary/85 [animation-delay:700ms]"></div>
                </div>
                <div className="flex h-[150px] flex-1 flex-col justify-end">
                  <div className="bar h-[88%] rounded-t-[6px] bg-accent [animation-delay:800ms]"></div>
                </div>
                <div className="flex h-[150px] flex-1 flex-col justify-end">
                  <div className="bar h-[66%] rounded-t-[6px] bg-primary/85 [animation-delay:900ms]"></div>
                </div>
              </div>
              <div className="mt-3 flex justify-between font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.1em] text-muted">
                <span>Top mgmt</span>
                <span>Exec</span>
                <span>Prof</span>
                <span>Skl</span>
                <span>Entry</span>
              </div>
              <div className="mt-5 border-t border-line/60 pt-4">
                <div className="mb-2 flex justify-between text-[11px]">
                  <span className="text-muted">Redesignated workforce</span>
                  <span className="font-[JetBrains_Mono] font-medium">61.4%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-panel">
                  <div className="sweep h-full w-[61%] rounded-full bg-accent"></div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-[min(1vw,12px)] bg-panel/70 p-3">
                <div className="shrink-0 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em] text-muted">
                  AI draft
                </div>
                <p className="text-[12px] leading-snug text-foreground">
                  "Black females exceed the 10% target at professional level; skills development gap
                  flagged for Top Mgmt."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="mx-auto max-w-[1200px] scroll-mt-20 px-6 py-16">
        <div className="mb-8 flex items-end justify-between gap-6">
          <h2 className="text-balance font-[Fraunces] text-[28px] font-medium tracking-tight">
            The capability stack
          </h2>
          <span className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.2em] text-muted">
            (a) platform
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rise rounded-[min(1vw,16px)] border border-line/60 bg-glass/55 p-5 ring-1 ring-black/5 backdrop-blur-xl transition-colors hover:bg-glass/80">
            <div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.18em] text-primary">01</div>
            <h3 className="mt-3 font-[Fraunces] text-[19px] font-medium tracking-tight">
              AI-assisted EE reporting
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted text-pretty">
              Draft EEA2/EEA4 narratives and numeric filings from live HRIS data, ready for signature.
            </p>
          </div>
          <div className="rise rounded-[min(1vw,16px)] border border-line/60 bg-glass/55 p-5 ring-1 ring-black/5 backdrop-blur-xl transition-colors hover:bg-glass/80 [animation-delay:60ms]">
            <div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.18em] text-primary">02</div>
            <h3 className="mt-3 font-[Fraunces] text-[19px] font-medium tracking-tight">
              Workforce analytics
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted text-pretty">
              Benchmark representation, turnover and promotion velocity against sector and national
              targets.
            </p>
          </div>
          <div className="rise rounded-[min(1vw,16px)] border border-line/60 bg-glass/55 p-5 ring-1 ring-black/5 backdrop-blur-xl transition-colors hover:bg-glass/80 [animation-delay:120ms]">
            <div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.18em] text-primary">03</div>
            <h3 className="mt-3 font-[Fraunces] text-[19px] font-medium tracking-tight">
              Compliance tracking
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted text-pretty">
              Deadline radar for submissions, designated-employer thresholds and remediation windows.
            </p>
          </div>
          <div className="rise rounded-[min(1vw,16px)] border border-line/60 bg-glass/55 p-5 ring-1 ring-black/5 backdrop-blur-xl transition-colors hover:bg-glass/80 [animation-delay:180ms]">
            <div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.18em] text-primary">04</div>
            <h3 className="mt-3 font-[Fraunces] text-[19px] font-medium tracking-tight">
              Governance dashboards
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted text-pretty">
              Board-grade transformation views with an immutable audit trail for every figure.
            </p>
          </div>
        </div>
      </section>

      <section id="trust" className="mx-auto max-w-[1200px] scroll-mt-20 px-6 py-16">
        <div className="overflow-hidden rounded-[min(1.5vw,24px)] border border-line/60 bg-glass/55 ring-1 ring-black/5 backdrop-blur-2xl">
          <div className="grid items-center gap-8 p-6 lg:grid-cols-[1fr_1.1fr] lg:p-8">
            <div className="rise">
              <span className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.2em] text-muted">
                (b) trust
              </span>
              <h2 className="mt-3 text-balance font-[Fraunces] text-[26px] font-medium leading-tight tracking-tight">
                Built for the room where the Act is signed.
              </h2>
              <p className="mt-4 max-w-[44ch] text-[14px] leading-relaxed text-muted text-pretty">
                POPIA-aligned data residency, role-scoped access and export-ready evidence packs — so
                the Department, the Commission and your board read the same numbers.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-line/60 bg-panel/60 px-3 py-1.5 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.14em] text-muted">
                  POPIA
                </span>
                <span className="rounded-full border border-line/60 bg-panel/60 px-3 py-1.5 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.14em] text-muted">
                  ISO 27001
                </span>
                <span className="rounded-full border border-line/60 bg-panel/60 px-3 py-1.5 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.14em] text-muted">
                  EE Act §13
                </span>
                <span className="rounded-full border border-line/60 bg-panel/60 px-3 py-1.5 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.14em] text-muted">
                  B-BBEE aligned
                </span>
              </div>
            </div>
            <img
              src={glassPanels}
              alt="Abstract glass panels refracting a data grid"
              className="w-full rounded-[min(1vw,14px)]"
              width={1200}
              height={760}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-[1200px] scroll-mt-20 px-6 py-16">
        <div className="overflow-hidden rounded-[min(1.5vw,24px)] border border-line/60 bg-glass/60 ring-1 ring-black/5 backdrop-blur-2xl">
          <div className="grid gap-8 p-8 lg:grid-cols-[1.1fr_1fr] lg:p-12">
            <div className="rise">
              <h2 className="text-balance font-[Fraunces] text-[34px] font-medium leading-[1.08] tracking-tight">
                Put your next EEA9 submission on the record.
              </h2>
              <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-muted text-pretty">
                A 30-minute walkthrough with our compliance team — bring your workforce data, leave
                with a live transformation view.
              </p>
              <a
                href="mailto:compliance@ddhs.co.za"
                className="mt-7 inline-block rounded-full bg-primary px-7 py-3.5 text-[14px] font-medium text-primary-foreground ring-1 ring-black/5 transition-colors hover:bg-primary/90"
              >
                Request a demo
              </a>
            </div>
            <div className="rise rounded-[min(1vw,16px)] border border-line/60 bg-panel/50 p-5 [animation-delay:120ms]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em] text-muted">
                    Designated employer
                  </div>
                  <div className="mt-1 font-[Fraunces] text-[18px]">Yes · 50+ staff</div>
                </div>
                <div>
                  <div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em] text-muted">
                    Head office
                  </div>
                  <div className="mt-1 font-[Fraunces] text-[18px]">Sandton, Gauteng</div>
                </div>
                <div className="col-span-2 border-t border-line/60 pt-3">
                  <div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em] text-muted">
                    Compliance team contact
                  </div>
                  <div className="mt-1 font-[Fraunces] text-[18px]">compliance@ddhs.co.za</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line/60 bg-glass/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-4 px-6 py-8 text-[12px] text-muted md:flex-row md:items-center">
          <div className="flex items-baseline gap-2.5">
            <span className="font-[Fraunces] text-[16px] font-semibold tracking-tight text-foreground">
              DDHS Equity Intelligence
            </span>
            <span className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.18em]">
              (Pty) Ltd
            </span>
          </div>
          <div className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em]">
            © 2026 · Johannesburg · Registered in South Africa
          </div>
        </div>
      </footer>
    </div>
  );
}
