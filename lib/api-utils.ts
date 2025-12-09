import { NextRequest, NextResponse } from 'next/server';

export function validateAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const API_TOKEN = process.env.MOCK_API_TOKEN || 'demo-token';
  
  if (!authHeader || authHeader !== `Bearer ${API_TOKEN}`) {
    return false;
  }
  return true;
}

export function errorResponse(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function successResponse(data: any) {
  return NextResponse.json({ success: true, data });
}