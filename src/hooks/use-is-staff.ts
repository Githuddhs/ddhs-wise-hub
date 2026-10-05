import { useQuery } from "@tanstack/react-query";
import { getMyRole } from "@/lib/admin.functions";

/** Whether the signed-in account is a DDHS staff account (cached under ["my-role"]). */
export function useIsStaff() {
  const q = useQuery({ queryKey: ["my-role"], queryFn: () => getMyRole() });
  return {
    isStaff: q.data?.isAdmin === true,
    userId: q.data?.userId ?? "",
    email: q.data?.email ?? "",
    checked: q.isFetched,
  };
}
