import type { OrderStatus } from "@/lib/db/schema";

const LABELS: Record<OrderStatus, { text: string; className: string }> = {
  pending_payment: { text: "Awaiting payment", className: "bg-gold-100 text-gold-600" },
  paid: { text: "Confirmed", className: "bg-success-bg text-success" },
  shipped: { text: "Shipped", className: "bg-royal-50 text-royal-600" },
  delivered: { text: "Delivered", className: "bg-success-bg text-success" },
  cancelled: { text: "Cancelled", className: "bg-royal-50 text-ink-600" },
  refunded: { text: "Refunded", className: "bg-royal-50 text-ink-600" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { text, className } = LABELS[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{text}</span>
  );
}
