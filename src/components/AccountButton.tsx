import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AccountButton() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setEmail(data.user?.email ?? null); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!ready) return <span className="w-16" />;
  if (!email) return <Link to="/auth" className="text-[13px] text-muted hover:text-foreground">Sign in</Link>;
  return (
    <span className="flex items-center gap-3 text-[13px]">
      <span className="hidden max-w-[160px] truncate text-muted lg:inline">{email}</span>
      <button onClick={signOut} className="text-muted underline hover:text-foreground">Sign out</button>
    </span>
  );
}
