// app/api/lex/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  LexRuntimeV2Client, 
  RecognizeTextCommand 
} from '@aws-sdk/client-lex-runtime-v2';

// Initialize the Lex Runtime V2 client
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
      return NextResponse.json(
        { error: 'Missing required fields: text and sessionId' },
        { status: 400 }
      );
    }

    const command = new RecognizeTextCommand({
      botId: process.env.NEXT_PUBLIC_LEX_BOT_ID,
      botAliasId: process.env.NEXT_PUBLIC_LEX_BOT_ALIAS_ID,
      localeId: process.env.NEXT_PUBLIC_LEX_LOCALE_ID,
      sessionId: sessionId,
      text: text,
    });
    
    // Send the text to Lex and wait for the response
    const lexResponse = await lexClient.send(command);

    return NextResponse.json(lexResponse);

  } catch (error) {
    console.error('Lex process error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to process message with Lex', details: errorMessage },
      { status: 500 }
    );
  }
}