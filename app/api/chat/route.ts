import { NextRequest } from 'next/server';
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { cookies } from 'next/headers';
import { authOptions } from "@/lib/auth";
import { OrchestratorService } from '@/lib/services/orchestrator-service';
import { errorResponse, successResponse } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('===== CHAT API REQUEST (NUCLEAR OPTION) =====');
    
    const session = await getServerSession(authOptions);
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET || "development-secret-key-change-me" });
    const cookieStore = await cookies(); // ← FIX: Added await
    const sessionToken = cookieStore.get('next-auth.session-token') || cookieStore.get('__Secure-next-auth.session-token');
    
    const isAuthenticated = !!(session || token || sessionToken);
    
    console.log('Multi-method authentication check:', {
      method1_session: !!session,
      method1_email: session?.user?.email,
      method2_token: !!token,
      method2_email: token?.email,
      method3_cookie: !!sessionToken,
      method3_value: sessionToken?.value?.substring(0, 20) + '...',
      finalAuth: isAuthenticated,
      timestamp: new Date().toISOString()
    });
    
    const userEmail = session?.user?.email || token?.email || 'unknown';
    const userName = session?.user?.name || token?.name || 'Demo User';
    
    const { text, sessionId } = await request.json();

    if (!text) {
      return errorResponse('Message text is required', 400);
    }

    const effectiveSessionId = userEmail !== 'unknown' ? userEmail : sessionId || 'anonymous-session';

    console.log('Processing message:', {
      text: text.substring(0, 50) + '...',
      sessionId: effectiveSessionId,
      isAuthenticated,
      authMethod: session ? 'session' : token ? 'token' : sessionToken ? 'cookie' : 'none'
    });

    const result = await OrchestratorService.routeRequest(text, effectiveSessionId, isAuthenticated);

    console.log('Orchestrator result:', {
      source: result.source,
      intent: result.intent,
      actionRequired: result.actionRequired,
      hasQuickReplies: !!result.quickReplies,
      textPreview: result.text.substring(0, 50) + '...'
    });
    
    console.log('===== END CHAT API REQUEST =====\n');

    return successResponse({
      ...result,
      authenticated: isAuthenticated,
      _debug: {
        sessionEmail: userEmail,
        sessionName: userName,
        authMethod: session ? 'session' : token ? 'token' : sessionToken ? 'cookie' : 'none',
        hasSession: !!session,
        hasToken: !!token,
        hasCookie: !!sessionToken
      }
    });

  } catch (error) {
    console.error('===== CHAT API ERROR =====');
    console.error('Error:', error);
    console.error('===== END ERROR =====\n');
    return errorResponse('Failed to process message');
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';