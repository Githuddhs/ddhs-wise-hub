import { supabase } from "@/integrations/supabase/client";

/** Loads every employee row, paging past the backend's 1,000-row response cap. */
export async function fetchAllEmployees<T = unknown>(): Promise<T[]> {
  const page = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from("employees").select("*").order("employee_no").range(from, from + page - 1);
    if (error) throw new Error(error.message);
    all.push(...((data ?? []) as T[]));
    if (!data || data.length < page) return all;
  }
}
