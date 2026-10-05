import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Guided first-login wizard. Any signed-in user may read and complete their own
// onboarding state; RLS on profiles already scopes rows to the owner.

export const getOnboardingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdm } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data, error } = await context.supabase
      .from("profiles")
      .select("full_name, company, job_title, sector, email, onboarded_at")
      .eq("id", context.userId)
      .limit(1);
    if (error) throw new Error(error.message);
    const p = data?.[0];
    return {
      isAdmin: isAdm === true,
      onboarded: isAdm === true || p?.onboarded_at != null,
      fullName: p?.full_name ?? "",
      company: p?.company ?? "",
      jobTitle: p?.job_title ?? "",
      sector: p?.sector ?? "",
      email: p?.email ?? "",
    };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      full_name: z.string().trim().min(2, "Enter your name.").max(100),
      company: z.string().trim().min(1, "Enter the company name.").max(150),
      job_title: z.string().trim().max(100).optional(),
      sector: z.string().trim().min(1, "Choose a sector.").max(100),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        company: data.company,
        job_title: data.job_title ?? "",
        sector: data.sector,
        onboarded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
