import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — DDHS Equity Intelligence" },
      { name: "description", content: "Sign in or create a DDHS Equity Intelligence account to use the Employment Equity tools." },
      { property: "og:title", content: "Sign in — DDHS Equity Intelligence" },
      { property: "og:description", content: "Access the AI gap assessment, planner, progress review and EE Plan tools." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const safePath = (p?: string) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/assess");
const field = "mt-1.5 w-full rounded-lg border border-line/70 bg-panel/60 px-3 py-2.5 text-[14px]";
const label = "font-[JetBrains_Mono] text-[11px] uppercase tracking-wider text-muted";

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const dest = safePath(redirect);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [f, setF] = useState({ email: "", password: "", full_name: "", company: "", job_title: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: dest, replace: true }); });
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) navigate({ to: dest, replace: true }); });
    return () => data.subscription.unsubscribe();
  }, [dest, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg(""); setBusy(true);
    try {
      if (mode === "up") {
        if (f.full_name.trim().length < 2) throw new Error("Please enter your full name.");
        if (f.password.length < 8) throw new Error("Use a password of at least 8 characters.");
        const { data, error } = await supabase.auth.signUp({
          email: f.email.trim(), password: f.password,
          options: { emailRedirectTo: window.location.origin + dest, data: { full_name: f.full_name.trim(), company: f.company.trim(), job_title: f.job_title.trim() } },
        });
        if (error) throw error;
        if (!data.session) setMsg("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) throw error;
      }
    } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); }
    setBusy(false);
  }

  async function google() {
    setErr("");
    sessionStorage.setItem("ddhs-auth-dest", dest);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) setErr("Google sign-in didn't complete. Please try again.");
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("ddhs-auth-dest");
    if (!saved) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { sessionStorage.removeItem("ddhs-auth-dest"); navigate({ to: safePath(saved), replace: true }); }
    });
  }, [navigate]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-[440px]">
        <Link to="/" className="font-[Fraunces] text-[20px]">DDHS Equity Intelligence</Link>
        <div className="mt-8 rounded-[20px] border border-line/60 bg-glass/60 p-7 backdrop-blur-2xl">
          <h1 className="font-[Fraunces] text-[30px] leading-tight">{mode === "in" ? "Sign in" : "Create your account"}</h1>
          <p className="mt-2 text-[14px] text-muted">Access the gap assessment, planner, progress review and EE Plan tools.</p>

          <button type="button" onClick={google} className="mt-6 w-full rounded-full border border-line/70 bg-panel/60 px-5 py-3 text-[14px] font-medium hover:border-primary/60">
            Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-[12px] text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "up" && (
              <>
                <label className="block"><span className={label}>Full name</span><input required maxLength={100} value={f.full_name} onChange={set("full_name")} className={field} /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className={label}>Company</span><input maxLength={150} value={f.company} onChange={set("company")} className={field} /></label>
                  <label className="block"><span className={label}>Job title</span><input maxLength={100} value={f.job_title} onChange={set("job_title")} className={field} /></label>
                </div>
              </>
            )}
            <label className="block"><span className={label}>Work email</span><input type="email" required maxLength={255} value={f.email} onChange={set("email")} className={field} /></label>
            <label className="block"><span className={label}>Password</span><input type="password" required minLength={mode === "up" ? 8 : 1} value={f.password} onChange={set("password")} className={field} /></label>
            {err && <p role="alert" className="text-[13px] text-destructive">{err}</p>}
            {msg && <p className="text-[13px] text-primary">{msg}</p>}
            <button disabled={busy} className="w-full rounded-full bg-primary px-6 py-3 text-[14px] font-medium text-primary-foreground disabled:opacity-60">
              {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
            </button>
          </form>
          <p className="mt-5 text-center text-[13px] text-muted">
            {mode === "in" ? "New here? " : "Already have an account? "}
            <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); setMsg(""); }} className="underline">
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
