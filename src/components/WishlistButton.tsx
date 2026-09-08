"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { api, ApiError } from "@/lib/client";

/**
 * Optimistic save toggle. Guests are sent to sign-in with a `next` back to
 * wherever they were, so the intent survives the detour.
 */
export function WishlistButton({
  productId,
  initialSaved = false,
  floating = false,
}: {
  productId: string;
  initialSaved?: boolean;
  floating?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function toggle() {
    const next = !saved;
    setSaved(next); // optimistic

    try {
      if (next) {
        await api("/api/v1/wishlist", {
          method: "POST",
          body: JSON.stringify({ productId }),
        });
      } else {
        await api(`/api/v1/wishlist/${productId}`, { method: "DELETE" });
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setSaved(!next); // roll back
      if (err instanceof ApiError && err.status === 401) {
        const back = encodeURIComponent(window.location.pathname);
        router.push(`/login?next=${back}`);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      className={
        floating
          ? "absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-card/90 backdrop-blur transition hover:bg-card"
          : "grid h-11 w-11 place-items-center rounded-full border border-line bg-card transition hover:border-royal-200"
      }
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 transition-colors ${saved ? "text-danger" : "text-ink-400"}`}
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden
      >
        <path d="M12 20.5 4.2 12.9a4.7 4.7 0 0 1 0-6.7 4.8 4.8 0 0 1 6.8 0l1 1 1-1a4.8 4.8 0 0 1 6.8 0 4.7 4.7 0 0 1 0 6.7Z" />
      </svg>
    </button>
  );
}
