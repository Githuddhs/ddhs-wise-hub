import { useEffect, useState } from "react";
import { clearViewingAs, readViewingAs, returnToOwnAccount, type SavedSession } from "@/lib/impersonate";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shown while a DDHS staff account is looking through a client's account, so it is
 * never mistaken for their own workspace. Rendered once, at the top of every page.
 */
export function ViewingAsBanner() {
  const [saved, setSaved] = useState<SavedSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const s = readViewingAs();
    if (!s) return;
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { clearViewingAs(); return; }
      if (data.user.id === s.adminId) { clearViewingAs(); return; }
      setSaved(s);
    });
  }, []);

  if (!saved) return null;

  async function back() {
    setBusy(true); setErr("");
    try { await returnToOwnAccount(saved as SavedSession); }
    catch (e) { setErr((e as Error).message); setBusy(false); }
  }

  return (
    <div role="status" className="sticky top-0 z-50 border-b border-primary/40 bg-primary/10 px-6 py-2 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 text-[13px]">
        <span>
          <span className="font-medium">Viewing as {saved.clientLabel}</span>
          <span className="text-muted"> — this is a client account, not {saved.adminLabel}.</span>
        </span>
        <span className="flex items-center gap-3">
          <button disabled={busy} onClick={back} className="rounded-full border border-line/70 px-3 py-1 text-[12px] hover:bg-panel disabled:opacity-50">
            {busy ? "Returning…" : "Back to my account"}
          </button>
        </span>
      </div>
      {err && <p className="mx-auto mt-1 max-w-[1200px] text-[12px] text-destructive">{err}</p>}
    </div>
  );
}
