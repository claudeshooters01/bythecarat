"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/client";
import { DEPARTMENTS, type Category } from "@/lib/db/schema";

/**
 * Minimal but complete product entry. Prices are typed in rupees — the API
 * converts to paise — because asking a merchandiser to type 12499900 is how
 * you end up selling a ring for ₹1.25 lakh too little.
 */
export function ProductForm({
  categories,
  onSaved,
}: {
  categories: Category[];
  onSaved: () => void;
}) {
  const [department, setDepartment] = useState<string>("jewellery");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const departmentCategories = categories.filter((c) => c.department === department);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const compareAt = Number(form.get("compareAt") ?? 0);

    try {
      await api("/api/v1/studio/products", {
        method: "POST",
        body: JSON.stringify({
          slug: String(form.get("slug") ?? ""),
          title: String(form.get("title") ?? ""),
          subtitle: String(form.get("subtitle") ?? ""),
          description: String(form.get("description") ?? ""),
          department,
          categoryId: Number(form.get("categoryId") ?? 0),
          brand: String(form.get("brand") ?? ""),
          price: Number(form.get("price") ?? 0),
          compareAt: compareAt > 0 ? compareAt : undefined,
          metal: String(form.get("metal") ?? ""),
          attributes: parseAttributes(String(form.get("attributes") ?? "")),
          imageUrls: String(form.get("imageUrls") ?? "")
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean),
          status: String(form.get("status") ?? "draft"),
          isFeatured: form.get("isFeatured") === "on",
          stockQty: Number(form.get("stockQty") ?? 0),
        }),
      });
      onSaved();
    } catch (err) {
      setPending(false);
      setError(err instanceof ApiError ? err.message : "Could not save that product.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-card p-6">
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Title" name="title" required />
        <Field label="URL slug" name="slug" placeholder="aurora-solitaire-ring" required />
        <Field label="Subtitle" name="subtitle" placeholder="0.50ct · 18k white gold" />
        <Field label="Brand / maker" name="brand" placeholder="Omega, or leave blank" />

        <label className="block">
          <span className="mt-4 block text-sm font-medium text-ink-900">Department</span>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm capitalize"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mt-4 block text-sm font-medium text-ink-900">Category</span>
          <select
            name="categoryId"
            required
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm"
          >
            {departmentCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <Field label="Price (₹)" name="price" type="number" min="1" required />
        <Field label="Compare-at price (₹, optional)" name="compareAt" type="number" min="0" />
        <Field label="Metal facet" name="metal" placeholder="gold-18k, platinum, steel" />
        <Field label="Stock quantity" name="stockQty" type="number" min="0" defaultValue="1" required />
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-ink-900">Description</span>
        <textarea
          name="description"
          rows={4}
          required
          minLength={20}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-ink-900">Image URLs</span>
        <textarea
          name="imageUrls"
          rows={3}
          placeholder="One per line. The first is the listing thumbnail."
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-ink-900">Specifications</span>
        <textarea
          name="attributes"
          rows={4}
          placeholder={"One per line, as Label: Value\nDiamond weight: 0.50ct\nClarity: VS1"}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm"
        />
      </label>

      <div className="flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2 text-sm text-ink-900">
          <input type="checkbox" name="isFeatured" className="h-4 w-4" />
          Feature on the home page
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-900">
          Status
          <select
            name="status"
            defaultValue="active"
            className="rounded-lg border border-line bg-paper px-2 py-1.5 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-royal-600 px-6 py-2.5 text-sm font-semibold text-on-accent hover:bg-royal-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save product"}
      </button>
    </form>
  );
}

/** "Clarity: VS1" per line → { Clarity: "VS1" }. */
function parseAttributes(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const sep = line.indexOf(":");
    if (sep < 1) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    if (key && value) out[key] = value;
  }
  return out;
}

function Field({
  label,
  name,
  type = "text",
  ...rest
}: { label: string; name: string; type?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mt-4 block text-sm font-medium text-ink-900">{label}</span>
      <input
        name={name}
        type={type}
        {...rest}
        className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-royal-500 focus:outline-none"
      />
    </label>
  );
}
