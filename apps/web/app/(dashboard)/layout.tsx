import { AuthGuard } from "@/components/auth-guard";
import { RoutePermissionGuard } from "@/components/route-permission-guard";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <RoutePermissionGuard>{children}</RoutePermissionGuard>
        </main>
      </div>
    </AuthGuard>
  );
}
