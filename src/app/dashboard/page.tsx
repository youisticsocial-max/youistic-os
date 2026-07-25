"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Check role from cookie
    const match = document.cookie.match(/(?:^|; )user_role=([^;]*)/);
    const role = match ? match[1].toUpperCase() : null;

    if (role === "SDR") {
      router.replace("/dashboard/sdr");
    } else if (role === "BDE") {
      router.replace("/dashboard/bde");
    } else {
      // CEO or unauthenticated redirects to /ceo/dashboard
      router.replace("/ceo/dashboard");
    }
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0b0f", color: "#64748b", fontSize: "14px" }}>
      Redirecting to CEO Portal...
    </div>
  );
}
