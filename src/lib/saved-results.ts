import { supabase } from "@/integrations/supabase/client";

export type Tool = "assess" | "plan" | "progress" | "review" | "dg";
export const TOOL_LABEL: Record<Tool, string> = { assess: "Gap assessment", plan: "Implementation plan", progress: "Progress & risk review", review: "Plan review", dg: "DG pack review" };

/** Saves a finished AI result to the signed-in user's dashboard (best effort). */
export async function saveResult(tool: Tool, content: string) {
  const text = content.trim();
  if (text.length < 40) return;
  const title = `${TOOL_LABEL[tool]} · ${new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`;
  const { error } = await supabase.from("saved_results").insert({ tool, title, content: text.slice(0, 100000) });
  if (error) console.warn("Could not save result", error.message);
}
