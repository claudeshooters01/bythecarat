"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({
  images,
  title,
}: {
  images: Array<{ id: string; url: string; alt: string | null }>;
  title: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="grid aspect-square place-items-center rounded-xl bg-card text-sm text-ink-400">
        Photography coming soon
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-card">
        <Image
          src={current.url}
          alt={current.alt ?? title}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="rail flex gap-3 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === active ? "border-royal-600" : "border-transparent hover:border-royal-200"
              }`}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
