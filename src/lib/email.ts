import { brand } from "@/lib/brand";

/**
 * Email transport seam, shaped like the payment seam.
 *
 * With RESEND_API_KEY set, mail goes out through Resend. Without it, the
 * message is logged instead — so the order flow is fully runnable locally and
 * in CI without a mail account, and a missing key degrades to "no email"
 * rather than to a failed checkout.
 *
 * Swapping Resend for SES or Postmark is a change inside this file.
 */
export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(email: Email): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? `${brand.name} <${brand.supportEmail}>`;

  if (!apiKey) {
    console.log(`[email] would send "${email.subject}" to ${email.to} (RESEND_API_KEY not set)`);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        reply_to: brand.supportEmail,
      }),
      // A slow mail provider must never hold up a payment webhook.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error(`[email] provider rejected the message (${res.status}):`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send failed:", err);
    return false;
  }
}
