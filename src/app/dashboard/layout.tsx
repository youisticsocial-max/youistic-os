import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { cookies } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value || "CEO";

  return (
    <div style={{ display: "flex", minHeight: "100dvh", width: "100%" }}>
      {/* Fixed Sidebar */}
      <Sidebar role={role} />

      {/* Main content — offset by sidebar width */}
      <div
        className="dashboard-main-container"
        style={{
          marginLeft: "240px",
          width: "calc(100% - 240px)",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
          background: "var(--bg-primary)",
          position: "relative",
          transition: "background 0.3s ease",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: "240px",
            right: 0,
            height: "400px",
            background:
              "radial-gradient(ellipse at top left, rgba(108,92,231,0.08) 0%, transparent 60%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Page content */}
        <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
