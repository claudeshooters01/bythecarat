import { brand } from "@/lib/brand";
import { formatInr } from "@/lib/money";
import { siteUrl } from "@/lib/site";
import type { Email } from "@/lib/email";
import type { Order, OrderItem } from "@/lib/db/schema";

/**
 * The customer's receipt. Deliberately plain HTML with inline styles and a
 * table layout — email clients are not browsers, and Gmail strips <style>
 * blocks. Every message also carries a text/plain alternative.
 */
export function orderConfirmationEmail(
  order: Order & { items: OrderItem[] },
): Email {
  const orderUrl = `${siteUrl}/orders/${order.id}`;
  const address = order.shippingAddress;

  const lines = order.items.map((item) => ({
    title: item.title,
    detail: [item.variantLabel, `Qty ${item.qty}`].filter(Boolean).join(" · "),
    amount: formatInr(item.unitPriceInr * item.qty),
  }));

  const text = [
    `Thank you — your order is confirmed.`,
    ``,
    `Order ${order.orderNumber}`,
    ``,
    ...lines.map((l) => `  ${l.title}${l.detail ? ` (${l.detail})` : ""} — ${l.amount}`),
    ``,
    `Subtotal: ${formatInr(order.subtotalInr)}`,
    `Shipping: ${order.shippingInr === 0 ? "Complimentary" : formatInr(order.shippingInr)}`,
    `GST: ${formatInr(order.taxInr)}`,
    `Total paid: ${formatInr(order.totalInr)}`,
    ``,
    `Delivering to:`,
    `  ${address.fullName}`,
    `  ${address.line1}${address.line2 ? `, ${address.line2}` : ""}`,
    `  ${address.city}, ${address.state} ${address.pincode}`,
    `  ${address.phone}`,
    ``,
    `Every parcel is insured and needs a signature, so please make sure someone`,
    `can receive it. Certificates travel with the piece.`,
    ``,
    `Track this order: ${orderUrl}`,
    ``,
    `Questions? Reply to this email or call ${brand.supportPhone}.`,
    `${brand.legal.entityName}`,
  ].join("\n");

  const rows = lines
    .map(
      (l) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e2dc;">
            <div style="color:#131a2c;font-size:15px;">${escapeHtml(l.title)}</div>
            ${l.detail ? `<div style="color:#5a6480;font-size:13px;margin-top:2px;">${escapeHtml(l.detail)}</div>` : ""}
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #e5e2dc;text-align:right;color:#131a2c;font-size:15px;white-space:nowrap;">
            ${l.amount}
          </td>
        </tr>`,
    )
    .join("");

  const totalRow = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:4px 0;color:${strong ? "#131a2c" : "#5a6480"};font-size:14px;${strong ? "font-weight:600;padding-top:12px;" : ""}">${label}</td>
      <td style="padding:4px 0;text-align:right;color:#131a2c;font-size:14px;${strong ? "font-weight:600;padding-top:12px;" : ""}">${value}</td>
    </tr>`;

  const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#fbfaf8;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbfaf8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e2dc;border-radius:12px;overflow:hidden;">

        <tr><td style="background:#0b1740;padding:28px 32px;">
          <div style="color:#ffffff;font-size:24px;letter-spacing:-0.3px;">By The <span style="color:#d9b968;">Carat</span></div>
        </td></tr>

        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:26px;color:#131a2c;font-weight:normal;">Thank you — your order is confirmed.</h1>
          <p style="margin:0 0 4px;color:#5a6480;font-size:15px;font-family:-apple-system,Segoe UI,sans-serif;">
            Order <strong style="color:#131a2c;">${escapeHtml(order.orderNumber)}</strong>
          </p>
          <p style="margin:0 0 24px;color:#5a6480;font-size:14px;font-family:-apple-system,Segoe UI,sans-serif;">
            We are preparing your pieces. Certificates travel with the parcel.
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:-apple-system,Segoe UI,sans-serif;">
            ${rows}
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-family:-apple-system,Segoe UI,sans-serif;">
            ${totalRow("Subtotal", formatInr(order.subtotalInr))}
            ${totalRow("Insured shipping", order.shippingInr === 0 ? "Complimentary" : formatInr(order.shippingInr))}
            ${totalRow("GST", formatInr(order.taxInr))}
            ${totalRow("Total paid", formatInr(order.totalInr), true)}
          </table>

          <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e2dc;font-family:-apple-system,Segoe UI,sans-serif;">
            <div style="color:#131a2c;font-size:14px;font-weight:600;">Delivering to</div>
            <div style="color:#5a6480;font-size:14px;line-height:1.6;margin-top:6px;">
              ${escapeHtml(address.fullName)}<br>
              ${escapeHtml(address.line1)}${address.line2 ? `<br>${escapeHtml(address.line2)}` : ""}<br>
              ${escapeHtml(address.city)}, ${escapeHtml(address.state)} ${escapeHtml(address.pincode)}<br>
              ${escapeHtml(address.phone)}
            </div>
            <p style="color:#5a6480;font-size:13px;line-height:1.6;margin:12px 0 0;">
              Every parcel is insured and requires a signature, so please make sure someone can
              receive it.
            </p>
          </div>

          <div style="margin-top:28px;text-align:center;">
            <a href="${orderUrl}" style="display:inline-block;background:#1e3a99;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:15px;font-weight:600;font-family:-apple-system,Segoe UI,sans-serif;">
              View your order
            </a>
          </div>
        </td></tr>

        <tr><td style="padding:20px 32px;background:#fbfaf8;border-top:1px solid #e5e2dc;font-family:-apple-system,Segoe UI,sans-serif;">
          <p style="margin:0;color:#8d95ad;font-size:12px;line-height:1.6;">
            Questions? Reply to this email or call ${escapeHtml(brand.supportPhone)}.<br>
            ${escapeHtml(brand.legal.entityName)}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  return {
    to: order.email,
    subject: `Your ${brand.name} order ${order.orderNumber} is confirmed`,
    html,
    text,
  };
}

/** Customer-supplied strings reach this template, so escape before interpolating. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
