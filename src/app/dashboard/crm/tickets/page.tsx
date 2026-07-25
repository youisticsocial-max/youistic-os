import { cookies } from "next/headers";
import TicketsClient from "./TicketsClient";

export default async function TicketsPage() {
  const cookieStore = await cookies();
  const userRole = (cookieStore.get("user_role")?.value || "CEO").toUpperCase();
  const loggedInName = cookieStore.get("user_name")?.value || "CEO";

  return <TicketsClient userRole={userRole} loggedInName={loggedInName} />;
}
