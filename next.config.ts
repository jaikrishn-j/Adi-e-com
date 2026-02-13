import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowLocalIP: !isProduction,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
      ...(!isProduction
        ? [
            {
              protocol: "http" as const,
              hostname: "localhost",
              port: "9000",
            },
            {
              protocol: "http" as const,
              hostname: "127.0.0.1",
              port: "9000",
            },
            {
              protocol: "http" as const,
              hostname: "minio",
              port: "9000",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
