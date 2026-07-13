import { Sidebar } from "@/components/sidebar";
import { ProfilesContent } from "@/components/profiles-content";

export default function ProfilesPage() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <ProfilesContent />
      </main>
    </div>
  );
}
