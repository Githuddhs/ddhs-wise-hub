import { createClient } from "@supabase/supabase-js";

/** Returns null when the request carries a valid signed-in user's token, else a 401 Response. */
export async function requireUser(request: Request): Promise<Response | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const deny = Response.json({ error: "Please sign in to use this tool." }, { status: 401 });
  if (!token) return deny;
  const sb = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  return error || !data.user ? deny : null;
}
