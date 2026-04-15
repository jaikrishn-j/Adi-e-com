import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Local file storage for product images.
 * Images are stored in the public/uploads/products directory
 * and served directly by Next.js static file server.
 */

const uploadDir = process.env.UPLOAD_DIR ?? "public/uploads/products";
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function detectImageMime(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "image/gif";
  }

  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Returns the base URL for uploaded images.
 * In development, uses localhost; in production, uses the app's base URL.
 */
function publicBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (baseUrl) {
    return baseUrl.replace(/\/$/, "");
  }

  // Default for local development
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  // Fallback for production - should be set via NEXT_PUBLIC_APP_URL
  return "";
}

/**
 * Ensures the upload directory exists.
 */
async function ensureUploadDir() {
  const fullPath = join(process.cwd(), uploadDir);
  try {
    await mkdir(fullPath, { recursive: true });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "EEXIST") {
      throw err;
    }
  }
  return fullPath;
}

export async function uploadProductImage(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedMime = detectImageMime(buffer);

  if (!detectedMime || !allowedMimeTypes.has(detectedMime)) {
    throw new Error("Invalid or unsupported image file");
  }

  if (file.type && file.type !== detectedMime) {
    throw new Error("Uploaded file type does not match file content");
  }

  const ext = (() => {
    switch (detectedMime) {
      case "image/png":
        return "png";
      case "image/webp":
        return "webp";
      case "image/gif":
        return "gif";
      default:
        return "jpg";
    }
  })();

  // Generate unique filename with timestamp and UUID
  const filename = `${Date.now()}-${randomUUID()}.${ext}`;
  const uploadPath = await ensureUploadDir();
  const filePath = join(uploadPath, filename);

  // Write file to disk
  await writeFile(filePath, buffer);

  // Return the public URL - derive relative path from uploadDir
  const relativePath = filePath.replace(process.cwd(), "").replace(/^\/+/, "/");
  return `${publicBaseUrl()}${relativePath}`;
}
