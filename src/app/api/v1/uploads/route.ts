import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { apiError, forbidden, handle, ok, unauthorized } from "@/lib/api";
import { canManage, getSession } from "@/lib/auth";

/**
 * Product photography uploads. In production (BLOB_READ_WRITE_TOKEN set)
 * files go to Vercel Blob's CDN; in development they fall back to local disk
 * served via /uploads/[name]. The client contract — POST multipart → { url } —
 * is identical in both modes, so the Studio never knows which is in play.
 */
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — jewellery shots are detail-heavy
// Statically scoped so the bundler traces only this folder (dev fallback only).
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

/** Trust the file's bytes, not the client-supplied name or MIME type. */
function sniffImageExt(buf: Buffer): "jpg" | "png" | "webp" | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (
    buf.length > 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "png";
  if (
    buf.length > 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) return "webp";
  return null;
}

export const POST = handle(async (req: Request) => {
  const user = await getSession();
  if (!user) return unauthorized();
  if (!canManage(user)) return forbidden();

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return apiError(400, "invalid_input", "Attach an image as the 'file' form field.");
  }
  if (file.size > MAX_BYTES) {
    return apiError(413, "too_large", "Images must be 8 MB or smaller.");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniffImageExt(buf);
  if (!ext) {
    return apiError(415, "unsupported_type", "Only JPEG, PNG or WebP images are allowed.");
  }

  const name = `${randomUUID()}.${ext}`;
  const contentType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`products/${name}`, buf, { access: "public", contentType });
    return ok({ url: blob.url }, { status: 201 });
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), buf);
  return ok({ url: `/uploads/${name}` }, { status: 201 });
});
