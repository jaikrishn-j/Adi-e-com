import { NextResponse } from "next/server";
import { requireAdminProfile } from "@/lib/auth";
import { getClientIp, isRateLimited, isTrustedOrigin } from "@/lib/security";
import { uploadProductImage } from "@/lib/storage";

const MAX_FILE_COUNT = 8;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_UPLOAD_BYTES = MAX_FILE_COUNT * MAX_FILE_SIZE_BYTES + 1024 * 1024;

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted origin" }, { status: 403 });
  }

  const profile = await requireAdminProfile();

  if (!profile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request.headers);
  if (await isRateLimited(`admin:uploads:${ip}:${profile.id}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (contentLength > MAX_TOTAL_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Upload payload is too large" },
      { status: 413 },
    );
  }

  const formData = await request.formData();
  const rawFiles = formData.getAll("files");
  const files = rawFiles.filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  if (files.length > MAX_FILE_COUNT) {
    return NextResponse.json({ error: "Maximum 8 images per upload" }, { status: 400 });
  }

  let uploaded: Array<{ name: string; url: string }>;
  try {
    uploaded = await Promise.all(
      files.map(async (file) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error("One or more files exceed the 5MB limit");
        }

        const url = await uploadProductImage(file);
        return { name: file.name, url };
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ uploaded });
}
