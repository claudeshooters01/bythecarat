import { promises as fs } from "fs";
import path from "path";

/**
 * Serves locally uploaded images with immutable cache headers (filenames are
 * content-unique UUIDs, so they never change). Development only — production
 * sets BLOB_READ_WRITE_TOKEN and images are absolute CDN URLs that never
 * reach this route. Swapping Blob for S3/R2 deletes this file entirely.
 */
// Statically scoped so the bundler traces only this folder, not the project.
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

// Strict allowlist: UUID + known extension. Nothing else can be addressed,
// which also rules out path traversal.
const NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!NAME_RE.test(name)) return new Response(null, { status: 404 });

  let buf: Buffer;
  try {
    buf = await fs.readFile(path.join(UPLOAD_DIR, name));
  } catch {
    return new Response(null, { status: 404 });
  }

  const ext = name.slice(name.lastIndexOf(".") + 1);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext],
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
