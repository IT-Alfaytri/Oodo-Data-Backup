import { STATUS_COLORS } from "@/lib/constants";

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const colors = STATUS_COLORS[status] ?? {
    bg: "bg-gray-100",
    text: "text-gray-800",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${colors.bg} ${colors.text}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
