import { useChatStore } from '@/store/chatStore';

export const useChat = () => {
  const { 
    addMessage, 
    setTyping, 
    setAuthenticated, 
    setAuthRequired, 
    resetConversation,
    isAuthenticated,
    sessionId
  } = useChatStore();

  // Unified Welcome Message
  const triggerWelcome = async () => {
    // Check if we already have messages, if so, don't re-trigger welcome
    if (useChatStore.getState().messages.length > 0) return;

    setTyping(true);
    // Simulate network delay for realism
    setTimeout(() => {
      addMessage({
        text: 'Welcome to SecureBank AI! I can help you with your accounts, transfers, or answer your support questions. How can I help you today?',
        isUser: false,
        timestamp: new Date(),
        quickReplies: ['Check Balance', 'Transfer Money', 'Hours', 'Lost Card']
      });
      setTyping(false);
    }, 800);
  };

  const sendMessage = async (text: string, isAuthRetry = false) => {
    if (!text.trim()) return;

    if (!isAuthRetry) {
        addMessage({ text, isUser: true, timestamp: new Date() });
    }
    
    setTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sessionId }),
      });

      const json = await response.json();
      
      if (!response.ok) throw new Error(json.error || 'API Error');

      const data = json.data;

      // Check if the backend is asking for authentication
      if (data.actionRequired === 'REQUIRE_AUTH' && !isAuthenticated) {
        setAuthRequired({ 
          required: true, 
          message: data.actionMessage || 'Authentication required for this action' 
        });
        
        addMessage({
          text: data.text,
          isUser: false,
          timestamp: new Date(),
          quickReplies: data.quickReplies,
          intent: data.intent
        });
      } else {
        // Normal response
        addMessage({
          text: data.text,
          isUser: false,
          timestamp: new Date(),
          quickReplies: data.quickReplies,
          intent: data.intent,
          // We can add a "Source" field here later for Kendra
        });
      }

    } catch (error) {
      console.error('SendMessage Error:', error);
      addMessage({ text: "I'm having trouble connecting right now. Please try again.", isUser: false, timestamp: new Date() });
    } finally {
      setTyping(false);
    }
  };

  return {
    sendMessage,
    triggerWelcome,
    resetConversation
  };
};