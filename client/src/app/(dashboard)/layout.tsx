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
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
