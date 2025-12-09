import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function validateAuth(request: NextRequest) {
  // We don't use the 'request' object here because NextAuth reads headers/cookies automatically,
  // but we keep the signature for compatibility if needed later.
  const session = await getServerSession(authOptions);
  return !!session;
}

export function errorResponse(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function successResponse<T>(data: T) {
  return NextResponse.json({ success: true, data });
}