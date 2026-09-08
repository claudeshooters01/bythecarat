"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client";
import { formatInr } from "@/lib/money";

type Variant = {
  id: string;
  optionLabel: string | null;
  optionValue: string | null;
  priceInr: number | null;
  stockQty: number;
};

/**
 * Variant picker + add to bag. Out-of-stock sizes stay visible but
 * unselectable — a shopper needs to know the size exists before they know it
 * is gone, and hiding it just reads as "you don't make my size".
 */
export function AddToBag({
  variants,
  basePriceInr,
}: {
  variants: Variant[];
  basePriceInr: number;
}) {
  const inStock = variants.filter((v) => v.stockQty > 0);
  const [variantId, setVariantId] = useState(inStock[0]?.id ?? variants[0]?.id ?? "");
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const selected = variants.find((v) => v.id === variantId);
  const optionLabel = variants.find((v) => v.optionLabel)?.optionLabel;
  const soldOut = !selected || selected.stockQty === 0;

  async function addToBag() {
    if (!variantId) return;
    setState("adding");
    setError(null);

    try {
      await api("/api/v1/cart/items", {
        method: "POST",
        body: JSON.stringify({ variantId, qty: 1 }),
      });
      setState("added");
      // Re-renders the server Header so the bag count is right.
      router.refresh();
      setTimeout(() => setState("idle"), 2500);
    } catch (err) {
      setState("idle");
      setError(err instanceof ApiError ? err.message : "Could not add to bag.");
    }
  }

  return (
    <div className="space-y-5">
      {optionLabel && variants.length > 1 && (
        <fieldset>
          <legend className="text-sm font-medium text-ink-900">
            {optionLabel}
            {selected?.optionValue && (
              <span className="ml-2 font-normal text-ink-600">{selected.optionValue}</span>
            )}
          </legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {variants.map((v) => {
              const disabled = v.stockQty === 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setVariantId(v.id)}
                  aria-pressed={v.id === variantId}
                  title={disabled ? "Sold out" : undefined}
                  className={`min-w-12 rounded-lg border px-3 py-2 text-sm transition ${
                    v.id === variantId
                      ? "border-royal-600 bg-royal-50 font-medium text-royal-700"
                      : "border-line text-ink-900 hover:border-royal-200"
                  } ${disabled ? "cursor-not-allowed text-ink-400 line-through opacity-60" : ""}`}
                >
                  {v.optionValue}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {selected && selected.stockQty > 0 && selected.stockQty <= 3 && (
        <p className="text-sm font-medium text-danger">
          Only {selected.stockQty} left — each piece is made in a small run.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addToBag}
          disabled={soldOut || state === "adding"}
          className="flex-1 rounded-full bg-royal-600 px-8 py-3.5 text-sm font-semibold text-on-accent transition hover:bg-royal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {soldOut
            ? "Sold out"
            : state === "adding"
              ? "Adding…"
              : state === "added"
                ? "Added to bag ✓"
                : `Add to bag — ${formatInr(selected?.priceInr ?? basePriceInr)}`}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
