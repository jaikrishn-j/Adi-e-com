import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 60_000;
const MAX_HITS = 60;
const requestMap = new Map<string, { count: number; expiresAt: number }>();

const IPV4_WITH_OPTIONAL_PORT = /^(\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?$/;

function normalizeIpCandidate(raw: string | null) {
  if (!raw) {
    return null;
  }

  const firstPart = raw.split(",")[0]?.trim();
  if (!firstPart) {
    return null;
  }

  if (firstPart.includes(":") && !firstPart.includes(".")) {
    // IPv6-like value. Keep as-is if it is a valid IPv6 token shape.
    const cleaned = firstPart.replace(/^\[|\]$/g, "");
    if (/^[a-fA-F0-9:]+$/.test(cleaned) && cleaned.includes(":")) {
      return cleaned.toLowerCase();
    }
    return null;
  }

  if (IPV4_WITH_OPTIONAL_PORT.test(firstPart)) {
    const [ip] = firstPart.split(":");
    const segments = ip.split(".").map(Number);
    if (segments.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) {
      return ip;
    }
  }

  return null;
}

export function getClientIp(headers: Headers) {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-vercel-forwarded-for"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for"),
  ];

  for (const candidate of candidates) {
    const parsed = normalizeIpCandidate(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return "unknown";
}

function isRateLimitedInMemory(key: string, maxHits: number, windowMs: number) {
  const now = Date.now();

  if (requestMap.size > 10_000) {
    for (const [entryKey, value] of requestMap.entries()) {
      if (value.expiresAt < now) {
        requestMap.delete(entryKey);
      }
    }
  }

  const row = requestMap.get(key);

  if (!row || row.expiresAt < now) {
    requestMap.set(key, { count: 1, expiresAt: now + windowMs });
    return false;
  }

  row.count += 1;
  return row.count > maxHits;
}

export async function isRateLimited(
  key: string,
  options?: {
    maxHits?: number;
    windowMs?: number;
  },
) {
  const maxHits = options?.maxHits ?? MAX_HITS;
  const windowMs = options?.windowMs ?? WINDOW_MS;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);

  try {
    const isLimited = await prisma.$transaction(async (tx) => {
      const existing = await tx.rateLimitEntry.findUnique({
        where: { key },
      });

      if (!existing || existing.expiresAt <= now) {
        await tx.rateLimitEntry.upsert({
          where: { key },
          update: {
            count: 1,
            expiresAt,
          },
          create: {
            key,
            count: 1,
            expiresAt,
          },
        });
        return false;
      }

      const updated = await tx.rateLimitEntry.update({
        where: { key },
        data: {
          count: {
            increment: 1,
          },
        },
        select: {
          count: true,
        },
      });

      return updated.count > maxHits;
    });

    if (Math.random() < 0.02) {
      void prisma.rateLimitEntry
        .deleteMany({
          where: {
            expiresAt: {
              lt: now,
            },
          },
        })
        .catch(() => {});
    }

    return isLimited;
  } catch {
    // Fallback while migration is not applied or DB is unavailable.
    return isRateLimitedInMemory(key, maxHits, windowMs);
  }
}

export function cleanText(text: string, maxLength = 120) {
  return text.replace(/[<>]/g, "").trim().slice(0, maxLength);
}

export function cleanHttpUrl(input: string, maxLength = 500) {
  const trimmed = input.trim().slice(0, maxLength);
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function cleanExternalErrorBody(input: string, maxLength = 160) {
  const compact = input
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return compact.slice(0, maxLength);
}

export function isTrustedOrigin(
  request: Request,
  options?: {
    allowMissingOrigin?: boolean;
  },
) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return options?.allowMissingOrigin ?? false;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto");
  const expectedOrigin = host && proto ? `${proto}://${host}` : null;
  const httpOrigin = host ? `http://${host}` : null;
  const httpsOrigin = host ? `https://${host}` : null;

  const allowed = [
    expectedOrigin,
    httpOrigin,
    httpsOrigin,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter((value): value is string => Boolean(value));

  return allowed.some((value) => value === origin);
}

export function hashOrderId(orderId: string) {
  return createHash("sha256").update(orderId).digest("hex");
}

export function verifyRazorpaySignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  secret: string;
}) {
  const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
  const expected = createHmac("sha256", params.secret)
    .update(payload)
    .digest("hex");

  const incomingBuffer = Buffer.from(params.razorpaySignature);
  const expectedBuffer = Buffer.from(expected);

  if (incomingBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(incomingBuffer, expectedBuffer);
}
