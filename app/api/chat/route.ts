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

    // Use the session ID from the client, or fallback to user ID if logged in for consistency
    const effectiveSessionId = session?.user?.email || sessionId || 'anonymous-session';

    const result = await OrchestratorService.routeRequest(text, effectiveSessionId, isAuthenticated);

    return successResponse({
      ...result,
      authenticated: isAuthenticated // Echo back status
    });

  } catch (error) {
    console.error('Orchestrator Error:', error);
    return errorResponse('Failed to process message');
  }
}