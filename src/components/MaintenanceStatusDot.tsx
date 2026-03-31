import { getStatusDotColor, getStatusLabel } from "@/lib/services/maintenance-status";

type Status = "UPCOMING" | "SOON" | "OVERDUE" | "COMPLETED" | "OK";

export default function MaintenanceStatusDot({
  status,
  size = "w-3 h-3",
  className = "",
}: {
  status: Status;
  size?: string;
  className?: string;
}) {
  const color = getStatusDotColor(status);
  const label = getStatusLabel(status);
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${color} ${size} ${className}`}
      title={label}
      aria-hidden
    />
  );
}
