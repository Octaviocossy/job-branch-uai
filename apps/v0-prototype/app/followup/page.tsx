import { Sidebar } from "@/components/sidebar";
import { FollowupContent } from "@/components/followup-content";

export default function FollowupPage() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <FollowupContent />
      </main>
    </div>
  );
}
