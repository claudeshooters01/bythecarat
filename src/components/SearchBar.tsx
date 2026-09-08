"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const router = useRouter();

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
      }}
      className="relative w-full"
    >
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        name="q"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search solitaires, chains, vintage watches…"
        aria-label="Search products"
        className="w-full rounded-full border border-line bg-card py-2.5 pl-9 pr-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-royal-500 focus:outline-none"
      />
    </form>
  );
}
