"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/client";
import { DEPARTMENTS, type Category } from "@/lib/db/schema";

/** What the Studio's GET /studio/products/[id] returns, as far as this form cares. */
export type EditableProduct = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  department: string;
  categoryId: number;
  brand: string | null;
  priceInr: number;
  compareAtInr: number | null;
  metal: string | null;
  attributes: Record<string, string>;
  status: string;
  isFeatured: boolean;
  imageUrls: string[];
  variants: Array<{
    id: string;
    optionLabel: string | null;
    optionValue: string | null;
    stockQty: number;
  }>;
};

/**
 * Create and edit share one form — the fields are identical, only the verb
 * and the prefill differ. Prices are typed in rupees (the API converts to
 * paise), because asking a merchandiser to type 12499900 is how you end up
 * selling a ring for a lakh too little.
 */
export function ProductForm({
  categories,
  product,
  onSaved,
  onCancel,
}: {
  categories: Category[];
  /** Absent = create. Present = edit that product. */
  product?: EditableProduct;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [department, setDepartment] = useState(product?.department ?? "jewellery");
  const [images, setImages] = useState<string[]>(product?.imageUrls ?? []);
  // Stock is per variant. Collapsing five ring sizes into one number is how
  // you quietly zero out four of them.
  const [variantStock, setVariantStock] = useState<Record<string, number>>(() =>
    Object.fromEntries((product?.variants ?? []).map((v) => [v.id, v.stockQty])),
  );
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const departmentCategories = categories.filter((c) => c.department === department);
  const editing = Boolean(product);

  async function uploadFiles(files: FileList) {
    setUploading(true);
    setError(null);
    try {
      // Sequential rather than parallel: a jeweller dropping eight 8 MB
      // photos at once should not open eight concurrent uploads.
      for (const file of Array.from(files).slice(0, 8 - images.length)) {
        const body = new FormData();
        body.append("file", file);
        const { url } = await api<{ url: string }>("/api/v1/uploads", { method: "POST", body });
        setImages((prev) => [...prev, url]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function move(index: number, delta: number) {
    setImages((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const compareAt = Number(form.get("compareAt") ?? 0);

    const payload = {
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
      imageUrls: images,
      status: String(form.get("status") ?? "draft"),
      isFeatured: form.get("isFeatured") === "on",
      stockQty: Number(form.get("stockQty") ?? 0),
      variantStock: editing
        ? Object.entries(variantStock).map(([id, stockQty]) => ({ id, stockQty }))
        : undefined,
    };

    try {
      await api(
        editing ? `/api/v1/studio/products/${product!.id}` : "/api/v1/studio/products",
        { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) },
      );
      onSaved();
    } catch (err) {
      setPending(false);
      setError(err instanceof ApiError ? err.message : "Could not save that product.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-line bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl text-ink-900">
          {editing ? `Editing ${product!.title}` : "New product"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-ink-600 underline underline-offset-2 hover:text-ink-900"
        >
          Cancel
        </button>
      </div>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Title" name="title" defaultValue={product?.title} required />
        <Field
          label="URL slug"
          name="slug"
          defaultValue={product?.slug}
          placeholder="aurora-solitaire-ring"
          required
        />
        <Field
          label="Subtitle"
          name="subtitle"
          defaultValue={product?.subtitle ?? ""}
          placeholder="0.50ct · 18k white gold"
        />
        <Field
          label="Brand / maker"
          name="brand"
          defaultValue={product?.brand ?? ""}
          placeholder="Omega, or leave blank"
        />

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
            defaultValue={product?.categoryId}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm"
          >
            {departmentCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <Field
          label="Price (₹)"
          name="price"
          type="number"
          min="1"
          defaultValue={product ? product.priceInr / 100 : undefined}
          required
        />
        <Field
          label="Compare-at price (₹, optional)"
          name="compareAt"
          type="number"
          min="0"
          defaultValue={product?.compareAtInr ? product.compareAtInr / 100 : undefined}
        />
        <Field
          label="Metal facet"
          name="metal"
          defaultValue={product?.metal ?? ""}
          placeholder="gold-18k, platinum, steel"
        />
        {!editing && (
          <Field label="Stock quantity" name="stockQty" type="number" min="0" defaultValue={1} required />
        )}
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-ink-900">Description</span>
        <textarea
          name="description"
          rows={4}
          required
          minLength={20}
          defaultValue={product?.description}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm"
        />
      </label>

      {editing && product!.variants.length > 0 && (
        <fieldset>
          <legend className="text-sm font-medium text-ink-900">
            Stock{" "}
            <span className="font-normal text-ink-400">
              — {product!.variants.length === 1 ? "single variant" : "per size"}
            </span>
          </legend>
          <div className="mt-2.5 flex flex-wrap gap-3">
            {product!.variants.map((v) => (
              <label key={v.id} className="flex items-center gap-2 text-sm">
                <span className="text-ink-600">
                  {v.optionValue ? `${v.optionLabel} ${v.optionValue}` : "One size"}
                </span>
                <input
                  type="number"
                  min="0"
                  value={variantStock[v.id] ?? 0}
                  onChange={(e) =>
                    setVariantStock((prev) => ({ ...prev, [v.id]: Number(e.target.value) }))
                  }
                  aria-label={`Stock for ${v.optionValue ?? "one size"}`}
                  className="w-20 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm"
                />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <ImageManager
        images={images}
        uploading={uploading}
        fileInput={fileInput}
        onPick={uploadFiles}
        onRemove={(i) => setImages((prev) => prev.filter((_, idx) => idx !== i))}
        onMove={move}
      />

      <label className="block">
        <span className="block text-sm font-medium text-ink-900">Specifications</span>
        <textarea
          name="attributes"
          rows={4}
          defaultValue={Object.entries(product?.attributes ?? {})
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")}
          placeholder={"One per line, as Label: Value\nDiamond weight: 0.50ct\nClarity: VS1"}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm"
        />
      </label>

      <div className="flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2 text-sm text-ink-900">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={product?.isFeatured}
            className="h-4 w-4"
          />
          Feature on the home page
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-900">
          Status
          <select
            name="status"
            defaultValue={product?.status ?? "active"}
            className="rounded-lg border border-line bg-paper px-2 py-1.5 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
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
        disabled={pending || uploading}
        className="rounded-full bg-royal-600 px-6 py-2.5 text-sm font-semibold text-on-accent hover:bg-royal-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : editing ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}

function ImageManager({
  images,
  uploading,
  fileInput,
  onPick,
  onRemove,
  onMove,
}: {
  images: string[];
  uploading: boolean;
  fileInput: React.RefObject<HTMLInputElement | null>;
  onPick: (files: FileList) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, delta: number) => void;
}) {
  return (
    <div>
      <span className="block text-sm font-medium text-ink-900">
        Photography{" "}
        <span className="font-normal text-ink-400">
          — first image is the listing thumbnail, up to 8
        </span>
      </span>

      {images.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-3">
          {images.map((url, i) => (
            <li key={url} className="relative">
              <div className="relative h-24 w-20 overflow-hidden rounded-lg border border-line bg-paper">
                <Image src={url} alt="" fill sizes="80px" className="object-cover" />
              </div>
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-royal-600 px-1.5 py-0.5 text-[10px] font-semibold text-on-accent">
                  Cover
                </span>
              )}
              <div className="mt-1 flex items-center justify-center gap-1">
                <IconButton label="Move left" disabled={i === 0} onClick={() => onMove(i, -1)}>
                  ←
                </IconButton>
                <IconButton
                  label="Remove image"
                  onClick={() => onRemove(i)}
                  className="hover:text-danger"
                >
                  ✕
                </IconButton>
                <IconButton
                  label="Move right"
                  disabled={i === images.length - 1}
                  onClick={() => onMove(i, 1)}
                >
                  →
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={uploading || images.length >= 8}
        onChange={(e) => e.target.files?.length && onPick(e.target.files)}
        className="mt-3 block w-full text-sm text-ink-600 file:mr-3 file:rounded-full file:border-0 file:bg-royal-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-royal-700 hover:file:bg-royal-100 disabled:opacity-50"
      />
      <p className="mt-1.5 text-xs text-ink-400">
        {uploading ? "Uploading…" : "JPEG, PNG or WebP · 8 MB max each"}
      </p>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-6 w-6 place-items-center rounded text-xs text-ink-600 hover:bg-royal-50 disabled:opacity-30 ${className}`}
    >
      {children}
    </button>
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
