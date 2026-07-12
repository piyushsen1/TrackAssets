import AuthGuard from "@/components/AuthGuard";
import { AuthProvider } from "@/context/AuthProvider";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard>
        <DashboardShell>{children}</DashboardShell>
      </AuthGuard>
    </AuthProvider>
  );
}
