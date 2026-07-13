import { Sidebar } from "@/components/sidebar";
import { AnalyticsContent } from "@/components/analytics-content";

export default function AnalyticsPage() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <AnalyticsContent />
      </main>
    </div>
  );
}
