import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function buildContentSecurityPolicy() {
  const imgSrc = new Set([
    "'self'",
    "data:",
    "blob:",
    "https:",
  ]);
  const connectSrc = new Set([
    "'self'",
    "ws:",
    "wss:",
    "https://api.clerk.com",
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.dev",
    "https://api.razorpay.com",
    "https://checkout.razorpay.com",
    "https://*.razorpay.com",
  ]);
  const frameSrc = new Set([
    "'self'",
    "https:",
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.dev",
    "https://checkout.razorpay.com",
    "https://*.razorpay.com",
  ]);

  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    imgSrc.add("http://localhost:9000");
    imgSrc.add("http://127.0.0.1:9000");
    imgSrc.add("http://minio:9000");
    connectSrc.add("http://localhost:9000");
    connectSrc.add("http://127.0.0.1:9000");
    connectSrc.add("http://minio:9000");
  }

  const minioPublicUrl = process.env.MINIO_PUBLIC_URL;
  if (minioPublicUrl) {
    try {
      const origin = new URL(minioPublicUrl).origin;
      imgSrc.add(origin);
      connectSrc.add(origin);
    } catch {
      // Ignore invalid URL values; validated elsewhere.
    }
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https:",
    `img-src ${Array.from(imgSrc).join(" ")}`,
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://*.clerk.dev https://checkout.razorpay.com https://*.razorpay.com",
    `connect-src ${Array.from(connectSrc).join(" ")}`,
    `frame-src ${Array.from(frameSrc).join(" ")}`,
  ].join("; ");
}

const isProtectedRoute = createRouteMatcher([
  "/cart(.*)",
  "/checkout(.*)",
  "/orders(.*)",
  "/admin(.*)",
  "/api/cart(.*)",
  "/api/orders(.*)",
  "/api/checkout(.*)",
  "/api/audit(.*)",
  "/api/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const response = NextResponse.next();
  const isProduction = process.env.NODE_ENV === "production";
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.headers.set("Cross-Origin-Resource-Policy", "same-site");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy());
  if (isProduction) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }
  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
