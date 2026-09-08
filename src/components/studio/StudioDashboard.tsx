"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProductForm, type EditableProduct } from "@/components/studio/ProductForm";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { api, ApiError } from "@/lib/client";
import { formatInr } from "@/lib/money";
import { ORDER_STATUSES, type Category, type OrderStatus } from "@/lib/db/schema";

type StudioProduct = {
  id: string;
  slug: string;
  title: string;
  department: string;
  priceInr: number;
  status: string;
  stockQty: number;
};

type StudioOrder = {
  id: string;
  orderNumber: string;
  email: string;
  status: OrderStatus;
  totalInr: number;
  createdAt: Date;
};

export function StudioDashboard({
  products,
  orders,
  categories,
}: {
  products: StudioProduct[];
  orders: StudioOrder[];
  categories: Category[];
}) {
  const [tab, setTab] = useState<"catalogue" | "orders">("catalogue");
  const [creating, setCreating] = useState(false);
  // The full product is fetched on demand rather than held for all 200 rows —
  // the table only needs a summary, and drafts must be openable too.
  const [editing, setEditing] = useState<EditableProduct | null>(null);
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function startEditing(id: string) {
    setError(null);
    setLoadingEdit(id);
    try {
      const full = await api<EditableProduct>(`/api/v1/studio/products/${id}`);
      setCreating(false);
      setEditing(full);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open that product.");
    } finally {
      setLoadingEdit(null);
    }
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
  }

  async function archive(id: string) {
    setError(null);
    try {
      await api(`/api/v1/studio/products/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not archive that product.");
    }
  }

  async function setStatus(id: string, status: OrderStatus) {
    setError(null);
    try {
      await api(`/api/v1/studio/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update that order.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <Tab active={tab === "catalogue"} onClick={() => setTab("catalogue")}>
          Catalogue ({products.length})
        </Tab>
        <Tab active={tab === "orders"} onClick={() => setTab("orders")}>
          Orders ({orders.length})
        </Tab>
        {tab === "catalogue" && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setCreating((v) => !v);
            }}
            className="ml-auto rounded-full bg-royal-600 px-5 py-2 text-sm font-semibold text-on-accent hover:bg-royal-700"
          >
            {creating ? "Close" : "New product"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {tab === "catalogue" && (
        <>
          {(creating || editing) && (
            <ProductForm
              // Remounts when switching products, so defaultValue prefills reset.
              key={editing?.id ?? "new"}
              categories={categories}
              product={editing ?? undefined}
              onCancel={closeForm}
              onSaved={() => {
                closeForm();
                router.refresh();
              }}
            />
          )}

          <div className="overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wider text-ink-400">
                <tr>
                  <Th>Product</Th>
                  <Th>Department</Th>
                  <Th>Price</Th>
                  <Th>Stock</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((product) => (
                  <tr key={product.id}>
                    <Td>
                      <span className="font-medium text-ink-900">{product.title}</span>
                      <span className="block text-xs text-ink-400">/{product.slug}</span>
                    </Td>
                    <Td className="capitalize">{product.department}</Td>
                    <Td className="tabular-nums">{formatInr(product.priceInr)}</Td>
                    <Td className={product.stockQty === 0 ? "text-danger" : ""}>
                      {product.stockQty}
                    </Td>
                    <Td className="capitalize">{product.status}</Td>
                    <Td>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          disabled={loadingEdit === product.id}
                          onClick={() => startEditing(product.id)}
                          className="text-xs text-royal-600 underline underline-offset-2 hover:text-royal-700 disabled:opacity-50"
                        >
                          {loadingEdit === product.id ? "Opening…" : "Edit"}
                        </button>
                        {product.status !== "archived" && (
                          <button
                            type="button"
                            onClick={() => archive(product.id)}
                            className="text-xs text-ink-600 underline underline-offset-2 hover:text-danger"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "orders" && (
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-ink-400">
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Total</Th>
                <Th>Status</Th>
                <Th>Move to</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id}>
                  <Td>
                    <span className="font-medium text-ink-900">{order.orderNumber}</span>
                    <span className="block text-xs text-ink-400">
                      {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </Td>
                  <Td>{order.email}</Td>
                  <Td className="tabular-nums">{formatInr(order.totalInr)}</Td>
                  <Td>
                    <OrderStatusBadge status={order.status} />
                  </Td>
                  <Td>
                    <select
                      value={order.status}
                      onChange={(e) => setStatus(order.id, e.target.value as OrderStatus)}
                      aria-label={`Change status of order ${order.orderNumber}`}
                      className="rounded-lg border border-line bg-paper px-2 py-1.5 text-xs text-ink-900"
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-2 text-sm ${
        active ? "bg-royal-50 font-semibold text-royal-700" : "text-ink-600 hover:text-ink-900"
      }`}
    >
      {children}
    </button>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top text-ink-600 ${className}`}>{children}</td>;
}
