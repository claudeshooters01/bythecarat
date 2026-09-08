import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listCollections } from "@/lib/services/catalog";

export const metadata: Metadata = {
  title: "Collections",
  description: "Curated groupings of diamond jewellery and restored antique watches.",
};

export default async function CollectionsPage() {
  const collections = await listCollections();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12">
      <h1 className="font-display text-4xl text-ink-900 sm:text-5xl">Collections</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-600">
        Small, deliberate groupings — put together by our gemmologists and watchmakers rather
        than by an algorithm.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <Link
            key={collection.id}
            href={`/collections/${collection.slug}`}
            className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl bg-panel p-6"
          >
            {collection.heroImageUrl && (
              <Image
                src={collection.heroImageUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="-z-10 object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
              />
            )}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-gradient-to-t from-panel via-panel/40 to-transparent"
            />
            <h2 className="font-display text-3xl text-on-panel">{collection.name}</h2>
            {collection.tagline && (
              <p className="mt-1 text-sm text-on-panel/75">{collection.tagline}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
