import { KendraClient, QueryCommand } from "@aws-sdk/client-kendra";

const kendraClient = new KendraClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface KendraResult {
  text: string;
  sources: { title: string; uri: string; excerpt: string }[];
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export const KendraService = {
  search: async (query: string): Promise<KendraResult> => {
    try {
      const indexId = process.env.KENDRA_INDEX_ID;
      
      if (!indexId) {
        console.warn("Kendra Index ID not found. Using mock response.");
        return {
          text: "I found some information in our FAQ database.",
          sources: [
            { 
              title: "Security FAQ", 
              uri: "#security", 
              excerpt: "To report a lost card, call 1-800-555-1234 immediately." 
            }
          ],
          confidence: 'MEDIUM'
        };
      }

      const command = new QueryCommand({
        IndexId: indexId,
        QueryText: query,
        PageSize: 3 // Limit source documents
      });

      const response = await kendraClient.send(command);
      
      // 1. Check for a direct "Answer" (Factoid/Question Answering)
      const answerResult = response.ResultItems?.find(item => item.Type === 'QUESTION_ANSWER' || item.Type === 'ANSWER');
      
      let answerText = "I found some relevant information:";
      if (answerResult && answerResult.AdditionalAttributes && answerResult.AdditionalAttributes[0].Value?.TextWithHighlightsValue?.Text) {
        answerText = answerResult.AdditionalAttributes[0].Value.TextWithHighlightsValue.Text;
      }

      // 2. Parse Documents for Citations
      const sources = response.ResultItems?.filter(item => item.Type === 'DOCUMENT').map(item => ({
        title: item.DocumentTitle?.Text || 'SecureBank Document',
        uri: item.DocumentURI || '#',
        excerpt: item.DocumentExcerpt?.Text || ''
      })) || [];

      // Determine aggregated confidence
      // Simplified logic: if we found a direct answer, assume high confidence
      const confidence = answerResult ? 'HIGH' : (sources.length > 0 ? 'MEDIUM' : 'LOW');

      if (sources.length === 0 && !answerResult) {
        return {
          text: "I searched our knowledge base but couldn't find a specific answer. Would you like to speak to an agent?",
          sources: [],
          confidence: 'LOW'
        };
      }

      return {
        text: answerText,
        sources,
        confidence
      };

    } catch (error) {
      console.error("Kendra Search Error:", error);
      // Fallback
      return {
        text: "I'm having trouble accessing the knowledge base right now.",
        sources: [],
        confidence: 'LOW'
      };
    }
  }
};