import { discountPercent, formatInr } from "@/lib/money";

/**
 * The one place a price is rendered. Struck-through MRP and the discount
 * badge only appear when there is a genuine reduction, which keeps the
 * "savings" claim honest across every surface at once.
 */
export function Price({
  priceInr,
  compareAtInr = null,
  size = "md",
}: {
  priceInr: number;
  compareAtInr?: number | null;
  size?: "sm" | "md" | "lg";
}) {
  const off = discountPercent(priceInr, compareAtInr);
  const scale = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
  }[size];

  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`${scale} font-semibold tracking-tight text-ink-900`}>
        {formatInr(priceInr)}
      </span>
      {off !== null && compareAtInr && (
        <>
          <span className="text-xs text-ink-400 line-through">{formatInr(compareAtInr)}</span>
          <span className="text-xs font-semibold text-success">{off}% off</span>
        </>
      )}
    </span>
  );
}
