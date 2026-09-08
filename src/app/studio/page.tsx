import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StudioDashboard } from "@/components/studio/StudioDashboard";
import { canManage, getSession } from "@/lib/auth";
import { listProductsForStudio } from "@/lib/services/admin";
import { listCategories } from "@/lib/services/catalog";
import { listAllOrders } from "@/lib/services/orders";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

/** Staff-only. The proxy gates the route; this re-checks at the data boundary. */
export default async function StudioPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/studio");
  if (!canManage(user)) redirect("/");

  const [products, orders, categories] = await Promise.all([
    listProductsForStudio(),
    listAllOrders(),
    listCategories(),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <h1 className="font-display text-4xl text-ink-900">Studio</h1>
      <p className="mt-2 text-sm text-ink-600">
        Catalogue and fulfilment. Signed in as {user.email}.
      </p>

      <div className="mt-8">
        <StudioDashboard products={products} orders={orders} categories={categories} />
      </div>
    </div>
  );
}
