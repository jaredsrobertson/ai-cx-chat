import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// --- API Contract Definitions ---
// This mimics enterprise standards (like Genesys or Salesforce API envelopes)

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export async function validateAuth(request: NextRequest) {
  const session = await getServerSession(authOptions);
  return !!session;
}

export function errorResponse(message: string, status: number = 500, code: string = 'INTERNAL_ERROR') {
  const response: ApiResponse<null> = {
    success: false,
    error: {
      code,
      message,
    },
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(response, { status });
}

export function successResponse<T>(data: T, status: number = 200) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(response, { status });
}