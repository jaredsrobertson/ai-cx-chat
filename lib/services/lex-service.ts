import { LexRuntimeV2Client, RecognizeTextCommand } from '@aws-sdk/client-lex-runtime-v2';

const lexClient = new LexRuntimeV2Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface LexResult {
  text: string;
  intent: string;
  confidence: number;
  quickReplies: string[];
}

export const LexService = {
  processMessage: async (text: string, sessionId: string): Promise<LexResult> => {
    const command = new RecognizeTextCommand({
      botId: process.env.NEXT_PUBLIC_LEX_BOT_ID,
      botAliasId: process.env.NEXT_PUBLIC_LEX_BOT_ALIAS_ID,
      localeId: process.env.NEXT_PUBLIC_LEX_LOCALE_ID,
      sessionId: sessionId,
      text: text,
    });

    const response = await lexClient.send(command);
    
    // Parse response
    const message = response.messages?.[0];
    let replyText = "I'm not sure how to help with that.";
    let quickReplies: string[] = [];

    if (message) {
      replyText = message.content || replyText;
      
      if (message.imageResponseCard?.buttons) {
        quickReplies = message.imageResponseCard.buttons.map(b => b.text || '');
      }
    }

    // Default fallbacks if Lex returns empty
    if (quickReplies.length === 0) {
      quickReplies = ['Account info', 'Fees', 'Hours'];
    }

    return {
      text: replyText,
      intent: response.sessionState?.intent?.name || 'Fallback',
      confidence: response.interpretations?.[0]?.nluConfidence?.score || 0,
      quickReplies
    };
  }
};