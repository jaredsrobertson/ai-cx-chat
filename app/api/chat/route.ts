import { NextRequest } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OrchestratorService } from '@/lib/services/orchestrator-service';
import { errorResponse, successResponse } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!session;
    
    const { text, sessionId } = await request.json();

    if (!text) {
      return errorResponse('Message text is required', 400);
    }

    // Use email as session ID if authenticated, otherwise use provided/anonymous
    const effectiveSessionId = session?.user?.email || sessionId || 'anonymous-session';

    const result = await OrchestratorService.routeRequest(
      text, 
      effectiveSessionId, 
      isAuthenticated
    );

    return successResponse({
      ...result,
      authenticated: isAuthenticated
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return errorResponse('Failed to process message');
  }
}

export const dynamic = 'force-dynamic';