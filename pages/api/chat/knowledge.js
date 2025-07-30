import { createApiHandler, createOpenAIStreamHandler } from '@/lib/apiUtils';
import { knowledgeBase } from '@/lib/knowledgeBase';
import { CONFIG } from '@/lib/config';

export const config = {
  runtime: 'edge',
};

// A simple retriever for the knowledge base
function getRelevantContext(message) {
  const lowerCaseMessage = message.toLowerCase();
  const relevantDoc = knowledgeBase.find(doc =>
    lowerCaseMessage.includes(doc.topic.toLowerCase())
  );
  // Fallback to a general context if no specific topic is found.
  return relevantDoc ? relevantDoc.content : knowledgeBase[0].content;
}

const systemPromptTemplate = (context) => `
  You are a helpful Knowledge Base Assistant for CloudBank.
  Your role is to answer user questions based *only* on the provided context.
  Do not use any outside information. If the answer is not in the context, say "I do not have information on that topic."

  Context:
  ---
  ${context}
  ---
`;

// This handler is slightly different as it needs to dynamically create the system prompt.
const knowledgeHandler = async (req) => {
  const { message, messages } = await req.json(); // Assuming messages for history context might be sent
  const relevantContext = getRelevantContext(message);
  const dynamicSystemPrompt = systemPromptTemplate(relevantContext);

  const streamHandler = createOpenAIStreamHandler({
    systemPrompt: dynamicSystemPrompt,
    maxTokens: 100, // Slightly more tokens for knowledge base answers
  });

  // Re-create a request-like object for the stream handler
  const newReq = {
    json: async () => ({ messages: messages || [{ role: 'user', content: message }] })
  };

  return streamHandler(newReq);
};


export default createApiHandler(knowledgeHandler);