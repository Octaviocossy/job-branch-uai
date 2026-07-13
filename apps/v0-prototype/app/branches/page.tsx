import { Sidebar } from "@/components/sidebar";
import { BranchesContent } from "@/components/branches-content";

export default function BranchesPage() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <BranchesContent />
      </main>
    </div>
  );
}
