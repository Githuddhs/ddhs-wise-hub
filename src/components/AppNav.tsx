import { Link } from "@tanstack/react-router";
import { useIsStaff } from "@/hooks/use-is-staff";

const GROUPS = [
  ["Data", [["/workforce", "Workforce data"], ["/analysis", "EEA12 analysis"]]],
  ["Plan", [["/ee-plan", "EEA13 plan"], ["/calendar", "Calendar"]]],
  ["Governance", [["/evidence", "Evidence"], ["/committee", "Committee"]]],
  ["AI tools", [["/assess", "Gap assessment"], ["/plan", "Planner"], ["/progress", "Progress"], ["/review", "Plan review"], ["/dg-review", "DG review"], ["/document", "Word builder"]]],
] as const;

/** Grouped navigation shown at the top of every signed-in workspace page. */
export function AppNav() {
  const { isStaff } = useIsStaff();
  return (
    <nav aria-label="Workspace" className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line/50 pb-4 text-[13px]">
      <Link to="/" className="font-[Fraunces] text-[17px] font-semibold">DDHS</Link>
      <Link to="/dashboard" className="text-muted hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>Dashboard</Link>
      {GROUPS.map(([g, links]) => (
        <span key={g} className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-[JetBrains_Mono] text-[10px] uppercase tracking-wider text-muted/70">{g}</span>
          {links.map(([to, label]) => (
            <Link key={to} to={to} className="text-muted hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>{label}</Link>
          ))}
        </span>
      ))}
      {!isStaff && <Link to="/my-billing" className="text-muted hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>Billing</Link>}
      {isStaff && (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-[JetBrains_Mono] text-[10px] uppercase tracking-wider text-muted/70">DDHS</span>
          <Link to="/clients" className="text-muted hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>Clients</Link>
          <Link to="/billing" className="text-muted hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>Invoices</Link>
        </span>
      )}
    </nav>
  );
}
