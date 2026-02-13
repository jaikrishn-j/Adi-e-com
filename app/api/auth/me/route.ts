import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAuthProfile } from "@/lib/auth";

export async function GET() {
  const profile = await requireAuthProfile();

  if (!profile) {
    return NextResponse.json({ authenticated: false, isAdmin: false });
  }

  return NextResponse.json({
    authenticated: true,
    isAdmin: profile.role === UserRole.ADMIN,
  });
}
