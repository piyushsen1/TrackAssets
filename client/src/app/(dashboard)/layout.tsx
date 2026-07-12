import { Sidebar } from "@/components/layout/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { AuthProvider } from "@/context/AuthProvider";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard>
        <div className="flex min-h-screen bg-[var(--surface-page)]">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
