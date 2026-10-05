import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { redirect: location.pathname } });

    // First-login wizard: accounts that haven't completed onboarding (and aren't
    // DDHS staff) are sent to /onboarding before any other page.
    if (location.pathname !== "/onboarding") {
      const [{ data: isAdm }, { data: prof }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" }),
        supabase.from("profiles").select("onboarded_at").eq("id", data.user.id).limit(1),
      ]);
      if (isAdm !== true && prof?.[0] && prof[0].onboarded_at == null) {
        throw redirect({ to: "/onboarding" });
      }
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
