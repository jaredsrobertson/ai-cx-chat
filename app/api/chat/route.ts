// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OrchestratorService } from '@/lib/services/orchestrator-service';
import { errorResponse, successResponse } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    // Get session FIRST before doing anything else
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!session;
    
    console.log('Chat API - Session check:', {
      isAuthenticated,
      userEmail: session?.user?.email,
      timestamp: new Date().toISOString()
    });
    
    const { text, sessionId } = await request.json();

    if (!text) {
      return errorResponse('Message text is required', 400);
    }

    // Use the session ID from the client, or fallback to user ID if logged in for consistency
    const effectiveSessionId = session?.user?.email || sessionId || 'anonymous-session';

    console.log('Processing message:', {
      text: text.substring(0, 50) + '...',
      sessionId: effectiveSessionId,
      isAuthenticated
    });

    const result = await OrchestratorService.routeRequest(text, effectiveSessionId, isAuthenticated);

    console.log('Orchestrator result:', {
      source: result.source,
      intent: result.intent,
      actionRequired: result.actionRequired,
      hasQuickReplies: !!result.quickReplies,
      textPreview: result.text.substring(0, 50) + '...'
    });

    return successResponse({
      ...result,
      authenticated: isAuthenticated // Echo back status for client verification
    });

  } catch (error) {
    console.error('Orchestrator Error:', error);
    return errorResponse('Failed to process message');
  }
}