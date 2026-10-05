import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getOnboardingState, completeOnboarding } from "@/lib/onboarding.functions";
import { SECTOR_NAMES } from "@/lib/sector-targets";
import { card, mono, input, btn, primaryBtn } from "@/lib/ui";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

const STEPS = ["Your details", "Company", "All set"] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const getState = useServerFn(getOnboardingState);
  const save = useServerFn(completeOnboarding);
  const { data } = useQuery({ queryKey: ["onboarding"], queryFn: getState });

  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState<string | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [sector, setSector] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!data) {
    return <main className="mx-auto max-w-xl px-6 py-16"><p className={mono}>Loading…</p></main>;
  }

  const name = fullName ?? data.fullName;
  const co = company ?? data.company;
  const title = jobTitle ?? data.jobTitle;
  const sec = sector ?? data.sector;

  const finish = async () => {
    setBusy(true);
    setError("");
    try {
      await save({ data: { full_name: name, company: co, job_title: title, sector: sec } });
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <p className={mono}>Welcome to DDHS Equity Intelligence</p>
      <h1 className="mt-2 font-[Fraunces] text-3xl">Let's set up your account</h1>
      <p className="mt-2 text-[14px] text-muted">
        Three quick steps. This takes under a minute and shapes the guidance you see.
      </p>

      <div className="mt-6 flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-line/50"}`} />
        ))}
      </div>

      <div className={`${card} mt-6`}>
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-[Fraunces] text-xl">Your details</h2>
            <label className="block text-[13px]">Your name
              <input className={`${input} mt-1`} maxLength={100} value={name} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Thandi Nkosi" /></label>
            <label className="block text-[13px]">Job title <span className="text-muted">(optional)</span>
              <input className={`${input} mt-1`} maxLength={100} value={title} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. HR Manager" /></label>
            <div className="flex justify-end">
              <button className={primaryBtn} disabled={name.trim().length < 2} onClick={() => setStep(1)}>Continue</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-[Fraunces] text-xl">Your company</h2>
            <label className="block text-[13px]">Company name
              <input className={`${input} mt-1`} maxLength={150} value={co} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Acme Manufacturing (Pty) Ltd" /></label>
            <label className="block text-[13px]">Sector
              <select className={`${input} mt-1`} value={sec} onChange={(e) => setSector(e.target.value)}>
                <option value="">Choose your sector…</option>
                {SECTOR_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
                <option value="Other / not sure">Other / not sure</option>
              </select></label>
            <p className="text-[12px] text-muted">We use your sector to compare your workforce against the April 2025 sector targets.</p>
            {error && <p className="text-[13px] text-red-600">{error}</p>}
            <div className="flex justify-between">
              <button className={btn} onClick={() => setStep(0)}>Back</button>
              <button className={primaryBtn} disabled={busy || !co.trim() || !sec} onClick={finish}>{busy ? "Saving…" : "Finish setup"}</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-[Fraunces] text-xl">You're all set, {name.split(" ")[0]}</h2>
            <p className="text-[14px] text-muted">A good first move is to load your workforce data — everything else (analysis, plan, dashboard) builds on it.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className={primaryBtn} onClick={() => navigate({ to: "/workforce" })}>Load workforce data</button>
              <button className={btn} onClick={() => navigate({ to: "/dashboard" })}>Go to the dashboard</button>
            </div>
            <p className="text-[12px] text-muted">
              You can also explore the <Link to="/assess" className="underline">gap assessment</Link> or <Link to="/committee" className="underline">committee tracker</Link> any time from the menu.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
