import { STATUS_CONFIG } from "@/config/status.config";
import type { ApplicationStatus } from "@/models";
import { cn } from "@/utilities/tailwind.utility";

interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full font-medium", config.bg, config.color, size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs")}>
      <span className={cn("shrink-0 rounded-full", config.dot, size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2")} />
      {config.label}
    </span>
  );
}
