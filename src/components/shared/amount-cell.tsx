import { formatAmount } from "@/lib/constants";

export function AmountCell({ amount }: { amount: number | null | undefined }) {
  return (
    <span className="font-semibold text-[#1a1a2e] whitespace-nowrap">
      {formatAmount(amount)}
    </span>
  );
}
