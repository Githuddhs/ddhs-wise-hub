import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { openClientSession } from "@/lib/admin.functions";

const KEY = "ddhs-viewing-as";

export type SavedSession = {
  adminId: string;
  adminLabel: string;
  clientLabel: string;
  session: Session;
};

/** Switches this browser into a client's account, keeping the staff session so it can be restored. */
export async function openAs(opts: { userId: string; adminId: string; adminLabel: string; clientLabel: string }) {
  const { data: cur } = await supabase.auth.getSession();
  if (!cur.session) throw new Error("Please sign in again.");
  sessionStorage.setItem(KEY, JSON.stringify({ adminId: opts.adminId, adminLabel: opts.adminLabel, clientLabel: opts.clientLabel, session: cur.session } satisfies SavedSession));

  const { tokenHash } = await openClientSession({ data: { user_id: opts.userId } });
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error) {
    sessionStorage.removeItem(KEY);
    throw new Error("That account could not be opened.");
  }
  window.location.assign("/dashboard");
}

export function readViewingAs(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

export function clearViewingAs() {
  sessionStorage.removeItem(KEY);
}

/** Puts the staff account back and reloads. */
export async function returnToOwnAccount(saved: SavedSession) {
  const { error } = await supabase.auth.setSession(saved.session);
  clearViewingAs();
  if (error) throw new Error("Your own session could not be restored. Please sign in again.");
  window.location.assign("/dashboard");
}
