import { cn } from "@/lib/utils";
import { ApplicationStatus, STATUS_CONFIG } from "@/lib/data";

interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full",
        config.bg,
        config.color,
        size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1"
      )}
    >
      <span className={cn("rounded-full shrink-0", config.dot, size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")} />
      {config.label}
    </span>
  );
}
