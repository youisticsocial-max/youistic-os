"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CeoAssetsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/assets");
  }, [router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0a0b0f", color: "#818cf8", fontSize: "14px", fontWeight: 600 }}>
      Loading Assets Vault...
    </div>
  );
}
