import { notFound } from "next/navigation";
import { APPLICATIONS } from "@/lib/data";
import { Sidebar } from "@/components/sidebar";
import { BranchDetail } from "@/components/branch-detail";

export default async function BranchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = APPLICATIONS.find((a) => a.id === id);
  if (!app) notFound();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <BranchDetail app={app} />
      </main>
    </div>
  );
}
