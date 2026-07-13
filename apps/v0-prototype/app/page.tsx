import { Sidebar } from "@/components/sidebar";
import { DashboardContent } from "@/components/dashboard-content";

export default function HomePage() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <DashboardContent />
      </main>
    </div>
  );
}
