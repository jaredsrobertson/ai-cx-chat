import { NextRequest } from 'next/server';
import { LexRuntimeV2Client, RecognizeTextCommand } from '@aws-sdk/client-lex-runtime-v2';
import { errorResponse, successResponse } from '@/lib/api-utils';

const lexClient = new LexRuntimeV2Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { text, sessionId } = await request.json();

    if (!text || !sessionId) {
      return errorResponse('Missing required fields', 400);
    }

    const command = new RecognizeTextCommand({
      botId: process.env.NEXT_PUBLIC_LEX_BOT_ID,
      botAliasId: process.env.NEXT_PUBLIC_LEX_BOT_ALIAS_ID,
      localeId: process.env.NEXT_PUBLIC_LEX_LOCALE_ID,
      sessionId: sessionId,
      text: text,
    });
    
    const lexResponse = await lexClient.send(command);
    return successResponse(lexResponse);

  } catch (error) {
    console.error('Lex Process Error:', error);
    return errorResponse('Failed to process message with Lex');
  }
}