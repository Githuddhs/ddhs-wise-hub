import { supabase } from "@/integrations/supabase/client";

/** fetch() for the AI tool endpoints, attaching the signed-in user's token. */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(url, { ...init, headers });
}
