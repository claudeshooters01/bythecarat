/**
 * Idempotent seed: categories, collections, a staff user, and a demo
 * catalogue. Safe to re-run — every insert is keyed on a natural unique
 * column and conflicts are updates, not duplicates.
 *
 * Run with: npm run db:seed
 */
import { eq } from "drizzle-orm";
import {
  db,
  categories,
  collections,
  productCollections,
  productImages,
  productVariants,
  products,
  users,
  type Department,
} from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { newId } from "../src/lib/ids";
import { paise } from "../src/lib/money";

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1000&q=80`;

const CATEGORIES = [
  { slug: "rings", name: "Rings", department: "jewellery", image: "1605100804763-247f67b3557e" },
  { slug: "earrings", name: "Earrings", department: "jewellery", image: "1535632066927-ab7c9ab60908" },
  { slug: "necklaces", name: "Necklaces", department: "jewellery", image: "1573408301185-9146fe634ad0" },
  { slug: "pendants", name: "Pendants", department: "jewellery", image: "1611652022419-a9419f74343d" },
  { slug: "bracelets", name: "Bracelets", department: "jewellery", image: "1596944924616-7b38e7cfac36" },
  { slug: "bangles", name: "Bangles", department: "jewellery", image: "1611591437281-460bfbe1220a" },
  { slug: "dress-watches", name: "Dress watches", department: "watches", image: "1524805444758-089113d48a6d" },
  { slug: "chronographs", name: "Chronographs", department: "watches", image: "1523170335258-f5ed11844a49" },
  { slug: "divers", name: "Divers", department: "watches", image: "1547996160-81dfa63595aa" },
  { slug: "pocket-watches", name: "Pocket watches", department: "watches", image: "1495856458515-0637185db551" },
] as const;

const COLLECTIONS = [
  {
    slug: "everyday-solitaires",
    name: "Everyday Solitaires",
    tagline: "Certified stones, built for daily wear",
    description:
      "Low-profile settings that survive handbags, keyboards and school runs. Every stone is IGI or GIA certified, and every setting is designed to be re-tipped rather than replaced.",
    hero: "1602751584552-8ba73aad10e1",
    featured: true,
  },
  {
    slug: "heirloom",
    name: "The Heirloom Room",
    tagline: "Pieces meant to outlive us",
    description:
      "Heavier gold, deeper settings, and the kind of construction that survives being handed down twice. Made slowly, in small runs.",
    hero: "1573408301185-9146fe634ad0",
    featured: true,
  },
  {
    slug: "the-watch-room",
    name: "The Watch Room",
    tagline: "Restored by hand, sold with the record",
    description:
      "Mechanical watches from the 1930s onward. Each arrives with a dated restoration record listing what we replaced — and, just as importantly, what we left alone.",
    hero: "1622434641406-a158123450f9",
    featured: true,
  },
] as const;

const RING_SIZES = ["10", "12", "14", "16", "18"];

type SeedProduct = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  department: Department;
  category: string;
  brand?: string;
  price: number;
  compareAt?: number;
  metal: string;
  attributes: Record<string, string>;
  images: string[];
  collections?: string[];
  featured?: boolean;
  sizes?: string[];
  stock: number;
};

const PRODUCTS: SeedProduct[] = [
  {
    slug: "aurora-solitaire-ring",
    title: "Aurora Solitaire Ring",
    subtitle: "0.50ct · 18k white gold",
    description:
      "A six-prong solitaire set low enough to wear under gloves. The stone is a brilliant-cut half-carat, F colour, VS1 clarity, and the shank is deliberately a touch heavier than fashion dictates so it can be re-sized twice without thinning.",
    department: "jewellery",
    category: "rings",
    price: 124999,
    compareAt: 149999,
    metal: "gold-18k",
    attributes: {
      "Diamond weight": "0.50 ct",
      Colour: "F",
      Clarity: "VS1",
      Cut: "Excellent",
      Metal: "18k white gold",
      Certification: "IGI",
      "Gross weight": "3.2 g",
    },
    images: ["1605100804763-247f67b3557e", "1602751584552-8ba73aad10e1"],
    collections: ["everyday-solitaires"],
    featured: true,
    sizes: RING_SIZES,
    stock: 6,
  },
  {
    slug: "meridian-band-ring",
    title: "Meridian Diamond Band",
    subtitle: "Eleven stones · 18k rose gold",
    description:
      "Eleven graduated brilliants channel-set into a rounded band. Comfortable enough to stack, sturdy enough to wear alone. The channel is closed on both sides, which is why it holds up where pavé usually starts shedding.",
    department: "jewellery",
    category: "rings",
    price: 89500,
    metal: "gold-18k",
    attributes: {
      "Total diamond weight": "0.33 ct",
      Clarity: "VS2",
      Metal: "18k rose gold",
      Certification: "IGI",
      "Band width": "2.4 mm",
    },
    images: ["1617038220319-276d3cfab638"],
    collections: ["everyday-solitaires"],
    sizes: RING_SIZES,
    stock: 9,
  },
  {
    slug: "petal-stud-earrings",
    title: "Petal Stud Earrings",
    subtitle: "0.25ct pair · platinum",
    description:
      "Martini-set studs on platinum posts with screw backs, because the most expensive thing about a stud earring is losing one. Sits flat against the lobe rather than tipping forward.",
    department: "jewellery",
    category: "earrings",
    price: 74000,
    compareAt: 82000,
    metal: "platinum",
    attributes: {
      "Total diamond weight": "0.25 ct",
      Colour: "G",
      Clarity: "VS2",
      Metal: "950 platinum",
      Back: "Screw back",
      Certification: "IGI",
    },
    images: ["1535632066927-ab7c9ab60908", "1599643478518-a784e5dc4c8f"],
    featured: true,
    stock: 14,
  },
  {
    slug: "kalyani-jhumka-earrings",
    title: "Kalyani Jhumka Earrings",
    subtitle: "22k gold · uncut polki",
    description:
      "A traditional jhumka in 22k, set with uncut polki and finished with a hand-strung pearl fringe. Hollow-formed so the weight stays wearable through a full evening.",
    department: "jewellery",
    category: "earrings",
    price: 168000,
    metal: "gold-22k",
    attributes: {
      Metal: "22k yellow gold",
      Stones: "Uncut polki, freshwater pearl",
      "Gross weight": "12.8 g",
      Hallmark: "BIS 916",
      Drop: "38 mm",
    },
    images: ["1599643478518-a784e5dc4c8f"],
    collections: ["heirloom"],
    stock: 4,
  },
  {
    slug: "riviera-tennis-necklace",
    title: "Riviera Tennis Necklace",
    subtitle: "3.10ct total · 18k white gold",
    description:
      "Eighty-six brilliants in a graduated line, each individually four-prong set so the necklace drapes instead of standing away from the collarbone. Double-locking clasp with a safety catch.",
    department: "jewellery",
    category: "necklaces",
    price: 489000,
    compareAt: 549000,
    metal: "gold-18k",
    attributes: {
      "Total diamond weight": "3.10 ct",
      Colour: "F–G",
      Clarity: "VS",
      Metal: "18k white gold",
      Length: "16 inches",
      Certification: "IGI",
    },
    images: ["1573408301185-9146fe634ad0", "1587836374828-4dbafa94cf0e"],
    collections: ["heirloom"],
    featured: true,
    stock: 2,
  },
  {
    slug: "sona-temple-necklace",
    title: "Sona Temple Necklace",
    subtitle: "22k gold · handcrafted",
    description:
      "Cast from a mould our head goldsmith cut in 2009 and has refused to retire. Temple motifs in high relief, with a matte-and-polish contrast finish applied entirely by hand.",
    department: "jewellery",
    category: "necklaces",
    price: 342000,
    metal: "gold-22k",
    attributes: {
      Metal: "22k yellow gold",
      "Gross weight": "28.4 g",
      Hallmark: "BIS 916",
      Finish: "Matte and high polish",
      Length: "18 inches",
    },
    images: ["1587836374828-4dbafa94cf0e"],
    collections: ["heirloom"],
    stock: 3,
  },
  {
    slug: "lumen-solitaire-pendant",
    title: "Lumen Solitaire Pendant",
    subtitle: "0.30ct · 18k white gold",
    description:
      "A single brilliant in a four-prong basket on an adjustable cable chain. The bail is soldered closed — an open bail is the reason most pendants are eventually found on the floor.",
    department: "jewellery",
    category: "pendants",
    price: 62500,
    metal: "gold-18k",
    attributes: {
      "Diamond weight": "0.30 ct",
      Colour: "G",
      Clarity: "VS1",
      Metal: "18k white gold",
      Chain: "Adjustable 16–18 inches",
      Certification: "IGI",
    },
    images: ["1611652022419-a9419f74343d"],
    collections: ["everyday-solitaires"],
    stock: 11,
  },
  {
    slug: "orbit-diamond-bracelet",
    title: "Orbit Diamond Bracelet",
    subtitle: "1.20ct total · 18k gold",
    description:
      "Alternating polished links and diamond-set stations, on a hidden box clasp. Sized to sit just past the wrist bone, where a bracelet stops sliding over the hand.",
    department: "jewellery",
    category: "bracelets",
    price: 215000,
    compareAt: 239000,
    metal: "gold-18k",
    attributes: {
      "Total diamond weight": "1.20 ct",
      Clarity: "VS",
      Metal: "18k yellow gold",
      Length: "7 inches",
      Clasp: "Hidden box with safety",
    },
    images: ["1596944924616-7b38e7cfac36"],
    stock: 5,
  },
  {
    slug: "vasanti-kada-bangle",
    title: "Vasanti Kada Bangle",
    subtitle: "22k gold · pair",
    description:
      "A matched pair of hollow kadas with a hinged opening and screw pin. Substantial to look at, light enough to wear all day, which is the entire trick of a well-made kada.",
    department: "jewellery",
    category: "bangles",
    price: 276000,
    metal: "gold-22k",
    attributes: {
      Metal: "22k yellow gold",
      "Gross weight": "22.6 g (pair)",
      Hallmark: "BIS 916",
      Opening: "Hinged with screw pin",
      "Inner diameter": "2.4 inches",
    },
    images: ["1611591437281-460bfbe1220a"],
    collections: ["heirloom"],
    stock: 4,
  },
  {
    slug: "halo-eternity-ring",
    title: "Halo Eternity Ring",
    subtitle: "Full eternity · platinum",
    description:
      "A full eternity band in platinum — stones all the way round, which means it cannot be resized, so we cut each one to order. Allow three weeks.",
    department: "jewellery",
    category: "rings",
    price: 198000,
    metal: "platinum",
    attributes: {
      "Total diamond weight": "1.00 ct",
      Colour: "F",
      Clarity: "VS1",
      Metal: "950 platinum",
      Setting: "Full eternity, shared prong",
      "Made to order": "3 weeks",
    },
    images: ["1515562141207-7a88fb7ce338"],
    collections: ["everyday-solitaires"],
    sizes: RING_SIZES,
    stock: 3,
  },
  {
    slug: "omega-seamaster-1963",
    title: "Omega Seamaster de Ville",
    subtitle: "1963 · calibre 562 automatic",
    description:
      "A honest 1963 Seamaster de Ville with its original silvered dial, unpolished lugs and the faint patina that tells you nobody has tried to make it look new. Serviced in our workshop in 2025: mainspring and gaskets replaced, everything else original.",
    department: "watches",
    category: "dress-watches",
    brand: "Omega",
    price: 385000,
    metal: "steel",
    attributes: {
      Year: "1963",
      Movement: "Calibre 562, automatic",
      "Case material": "Stainless steel",
      "Case size": "34 mm",
      Dial: "Original silvered, unrestored",
      "Water resistance": "Splash resistant only",
      "Last serviced": "2025",
    },
    images: ["1524805444758-089113d48a6d", "1523170335258-f5ed11844a49"],
    collections: ["the-watch-room"],
    featured: true,
    stock: 1,
  },
  {
    slug: "heuer-carrera-1970",
    title: "Heuer Carrera Chronograph",
    subtitle: "1970 · calibre 12",
    description:
      "Pre-TAG Heuer Carrera with the calibre 12 automatic chronograph movement and the left-hand crown that gives it away. Case is sharp and unpolished. Chronograph runs cleanly through all three registers.",
    department: "watches",
    category: "chronographs",
    brand: "Heuer",
    price: 940000,
    compareAt: 1050000,
    metal: "steel",
    attributes: {
      Year: "1970",
      Movement: "Calibre 12, automatic chronograph",
      "Case material": "Stainless steel",
      "Case size": "38 mm",
      Crown: "Left-hand",
      "Last serviced": "2024",
    },
    images: ["1523170335258-f5ed11844a49"],
    collections: ["the-watch-room"],
    featured: true,
    stock: 1,
  },
  {
    slug: "longines-legend-diver-1968",
    title: "Longines Legend Diver",
    subtitle: "1968 · super-compressor case",
    description:
      "A super-compressor diver with its internal rotating bezel and twin crowns intact. The dial has aged to a warm chocolate that no reissue has ever managed to fake. Gaskets renewed; we would still not swim in it.",
    department: "watches",
    category: "divers",
    brand: "Longines",
    price: 720000,
    metal: "steel",
    attributes: {
      Year: "1968",
      Movement: "Calibre 290, automatic",
      "Case material": "Stainless steel, super-compressor",
      "Case size": "42 mm",
      Bezel: "Internal rotating",
      "Water resistance": "Not recommended",
      "Last serviced": "2025",
    },
    images: ["1547996160-81dfa63595aa"],
    collections: ["the-watch-room"],
    stock: 1,
  },
  {
    slug: "jaeger-lecoultre-dress-1955",
    title: "Jaeger-LeCoultre Dress Watch",
    subtitle: "1955 · 18k gold, manual wind",
    description:
      "A 34mm gold dress watch from 1955, thin enough to disappear under a cuff. Manual wind, hand-finished movement, and a case with its original hallmarks still crisp on the inside of the back.",
    department: "watches",
    category: "dress-watches",
    brand: "Jaeger-LeCoultre",
    price: 615000,
    metal: "gold-18k",
    attributes: {
      Year: "1955",
      Movement: "Calibre P478, manual wind",
      "Case material": "18k yellow gold",
      "Case size": "34 mm",
      "Power reserve": "42 hours",
      "Last serviced": "2024",
    },
    images: ["1622434641406-a158123450f9"],
    collections: ["the-watch-room"],
    stock: 1,
  },
  {
    slug: "waltham-pocket-watch-1912",
    title: "Waltham Railroad Pocket Watch",
    subtitle: "1912 · 17-jewel, open face",
    description:
      "An American railroad-grade pocket watch from 1912, 17 jewels, lever set, in a gold-filled open-face case. Keeps time to within thirty seconds a day, which for a watch older than most countries' current constitutions is remarkable.",
    department: "watches",
    category: "pocket-watches",
    brand: "Waltham",
    price: 148000,
    metal: "gold-filled",
    attributes: {
      Year: "1912",
      Movement: "17-jewel, lever set",
      "Case material": "Gold-filled",
      "Case size": "50 mm",
      Accuracy: "±30 s/day",
      "Last serviced": "2025",
    },
    images: ["1495856458515-0637185db551"],
    collections: ["the-watch-room"],
    stock: 2,
  },
  {
    slug: "certina-ds-1972",
    title: "Certina DS Automatic",
    subtitle: "1972 · turtle-back case",
    description:
      "The everyday entry into vintage: a 1972 Certina DS with the double-security case, a movement that refuses to die, and a dial with just enough age to be interesting. Recently serviced and running well within tolerance.",
    department: "watches",
    category: "divers",
    brand: "Certina",
    price: 96000,
    compareAt: 112000,
    metal: "steel",
    attributes: {
      Year: "1972",
      Movement: "Calibre 25-651, automatic",
      "Case material": "Stainless steel",
      "Case size": "37 mm",
      "Water resistance": "Splash resistant",
      "Last serviced": "2025",
    },
    images: ["1608042314453-ae338d80c427", "1509941943102-10c232535736"],
    collections: ["the-watch-room"],
    stock: 2,
  },
];

async function seed() {
  console.log("Seeding By The Carat…");

  /* Categories */
  const categoryIds = new Map<string, number>();
  for (const [i, c] of CATEGORIES.entries()) {
    const [row] = await db
      .insert(categories)
      .values({
        slug: c.slug,
        name: c.name,
        department: c.department,
        imageUrl: img(c.image),
        position: i + 1,
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: c.name, imageUrl: img(c.image), position: i + 1 },
      })
      .returning({ id: categories.id });
    categoryIds.set(c.slug, row.id);
  }
  console.log(`  ${CATEGORIES.length} categories`);

  /* Collections */
  const collectionIds = new Map<string, number>();
  for (const [i, c] of COLLECTIONS.entries()) {
    const [row] = await db
      .insert(collections)
      .values({
        slug: c.slug,
        name: c.name,
        tagline: c.tagline,
        description: c.description,
        heroImageUrl: img(c.hero),
        isFeatured: c.featured,
        position: i + 1,
      })
      .onConflictDoUpdate({
        target: collections.slug,
        set: {
          name: c.name,
          tagline: c.tagline,
          description: c.description,
          heroImageUrl: img(c.hero),
          isFeatured: c.featured,
          position: i + 1,
        },
      })
      .returning({ id: collections.id });
    collectionIds.set(c.slug, row.id);
  }
  console.log(`  ${COLLECTIONS.length} collections`);

  /* Staff user */
  const email = (process.env.SEED_ADMIN_EMAIL ?? "studio@bythecarat.in").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "carat12345";
  await db
    .insert(users)
    .values({
      id: newId(),
      email,
      passwordHash: await hashPassword(password),
      // Not "Studio Admin": the header greets people by first name, and that
      // rendered as "Studio Studio" next to the Studio nav link.
      name: "Meera Nair",
      role: "admin",
    })
    .onConflictDoUpdate({ target: users.email, set: { name: "Meera Nair", role: "admin" } });
  console.log(`  admin user: ${email}`);

  /* Products */
  const publishedAt = new Date();
  for (const [i, p] of PRODUCTS.entries()) {
    const categoryId = categoryIds.get(p.category);
    if (!categoryId) throw new Error(`Unknown category ${p.category}`);

    // Stagger publish times so "newest" has a stable, meaningful order.
    const stamp = new Date(publishedAt.getTime() - i * 3_600_000);

    const [product] = await db
      .insert(products)
      .values({
        id: newId(),
        slug: p.slug,
        title: p.title,
        subtitle: p.subtitle,
        description: p.description,
        department: p.department,
        categoryId,
        brand: p.brand ?? null,
        priceInr: paise(p.price),
        compareAtInr: p.compareAt ? paise(p.compareAt) : null,
        metal: p.metal,
        attributes: p.attributes,
        status: "active",
        isFeatured: p.featured ?? false,
        publishedAt: stamp,
      })
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          title: p.title,
          subtitle: p.subtitle,
          description: p.description,
          priceInr: paise(p.price),
          compareAtInr: p.compareAt ? paise(p.compareAt) : null,
          metal: p.metal,
          attributes: p.attributes,
          status: "active",
          isFeatured: p.featured ?? false,
          publishedAt: stamp,
          updatedAt: new Date(),
        },
      })
      .returning({ id: products.id });

    // Replace-all for images and variants keeps a re-run exactly convergent.
    await db.delete(productImages).where(eq(productImages.productId, product.id));
    await db.insert(productImages).values(
      p.images.map((image, position) => ({
        id: newId(),
        productId: product.id,
        url: img(image),
        alt: p.title,
        position,
      })),
    );

    await db.delete(productVariants).where(eq(productVariants.productId, product.id));
    const skuBase = p.slug.toUpperCase().replace(/-/g, "").slice(0, 10);
    if (p.sizes) {
      await db.insert(productVariants).values(
        p.sizes.map((size, position) => ({
          id: newId(),
          productId: product.id,
          sku: `${skuBase}-${size}`,
          optionLabel: "Ring size",
          optionValue: size,
          stockQty: p.stock,
          position,
        })),
      );
    } else {
      await db.insert(productVariants).values({
        id: newId(),
        productId: product.id,
        sku: `${skuBase}-OS`,
        optionLabel: null,
        optionValue: null,
        stockQty: p.stock,
        position: 0,
      });
    }

    for (const slug of p.collections ?? []) {
      const collectionId = collectionIds.get(slug);
      if (!collectionId) continue;
      await db
        .insert(productCollections)
        .values({ productId: product.id, collectionId, position: i })
        .onConflictDoNothing();
    }
  }
  console.log(`  ${PRODUCTS.length} products`);
  console.log("Done.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
