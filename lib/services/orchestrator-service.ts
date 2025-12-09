import { DialogflowService } from './dialogflow-service';
import { LexService } from './lex-service';
import { KendraService } from './kendra-service';

type IntentCategory = 'BANKING' | 'SUPPORT' | 'GENERAL';

function classifyIntent(text: string): IntentCategory {
  const lower = text.toLowerCase();
  
  const bankingKeywords = ['transfer', 'balance', 'money', 'send', 'pay', 'transaction', 'checking', 'savings', 'deposit'];
  // Removed specific keywords that might be FAQs to allow Kendra to handle them if Lex misses
  const supportKeywords = ['hours', 'location', 'fee', 'charge', 'lost', 'stolen', 'card', 'password', 'login', 'help', 'contact', 'routing', 'rates'];
  
  if (bankingKeywords.some(k => lower.includes(k))) return 'BANKING';
  if (supportKeywords.some(k => lower.includes(k))) return 'SUPPORT';
  
  return 'GENERAL';
}

export const OrchestratorService = {
  routeRequest: async (text: string, sessionId: string, isAuthenticated: boolean) => {
    const category = classifyIntent(text);
    
    // 1. BANKING -> Dialogflow
    if (category === 'BANKING') {
      const dfResult = await DialogflowService.detectIntent(text, sessionId, isAuthenticated);
      return {
        source: 'Dialogflow',
        category,
        ...dfResult
      };
    } 
    
    // 2. SUPPORT/GENERAL -> Try Lex First
    const lexResult = await LexService.processMessage(text, sessionId);
    
    // Check if Lex actually handled it well.
    // If confidence is low OR it hit the FallbackIntent, use Kendra.
    const LEX_CONFIDENCE_THRESHOLD = 0.60;
    const isFallback = lexResult.intent === 'FallbackIntent' || lexResult.intent === 'Fallback';
    const isLowConfidence = lexResult.confidence < LEX_CONFIDENCE_THRESHOLD;

    if (isFallback || isLowConfidence) {
      console.log(`Lex miss (Intent: ${lexResult.intent}, Score: ${lexResult.confidence}). Failing over to Kendra.`);
      
      const kendraResult = await KendraService.search(text);
      
      return {
        source: 'Kendra',
        category: 'SEARCH',
        text: kendraResult.text,
        intent: 'KnowledgeSearch',
        confidence: 0.9, // Kendra results are usually high quality if found
        quickReplies: ['Talk to Agent', 'Main Menu'],
        sources: kendraResult.sources // Pass sources to UI
      };
    }

    // 3. Lex handled it successfully
    return {
      source: 'Lex',
      category,
      text: lexResult.text,
      intent: lexResult.intent,
      confidence: lexResult.confidence,
      quickReplies: lexResult.quickReplies,
      payload: null, 
    };
  }
};