import { GitBranch } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <GitBranch className="h-5 w-5 text-primary-foreground" />
        </div>
        <Link href="/" className="text-xl font-semibold text-foreground">
          JobBranch
        </Link>
      </div>
      {children}
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Track your job applications like a software pipeline.
      </p>
    </div>
  );
}
