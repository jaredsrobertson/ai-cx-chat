// Update the processMessage function in the chat slice
processMessage: async (message, tab, isRetry = false) => {
  // Don't add user message if retrying
  if (!isRetry) {
    get().addMessage(tab, 'user', 'text', message);
  }
  
  set({ loading: true });
  
  // Trigger analytics in parallel (non-blocking)
  (async () => {
    try {
      const analyzeRes = await fetch('/api/chat/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      
      if (analyzeRes.ok) {
        const reader = analyzeRes.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
        
        const finalJson = JSON.parse(result.trim().split('\n').pop());
        get().addAnalyticsEntry(finalJson);
      }
    } catch (error) {
      logger.warn('Analytics failed', error);
    }
  })();
  
  const { user } = get();
  const sessionId = localStorage.getItem(`sessionId_${user?.id || 'guest'}`) || uuidv4();
  localStorage.setItem(`sessionId_${user?.id || 'guest'}`, sessionId);
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({
        message,
        sessionId,
        botId: tab,
        messages: get().messages[tab].map(msg => ({
          role: msg.author === 'user' ? 'user' : 'assistant',
          content: (typeof msg.content === 'object' && msg.content !== null) 
            ? msg.content.speakableText 
            : msg.content
        }))
      }),
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Request failed');
    }
    
    if (tab === 'banking') {
      const res = await response.json();
      
      logger.debug('Banking response received', { 
        success: res.success,
        hasData: !!res.data,
        action: res.data?.action 
      });
      
      if (res.data?.action === 'AUTH_REQUIRED') {
        // User needs to log in
        set({ pendingMessage: { message, tab } });
        get().addMessage(tab, 'bot', 'text', res.data.speakableText || "Please log in to continue.");
        
        // Trigger login modal after a short delay
        setTimeout(() => {
          const loginButton = document.querySelector('[data-login-trigger]');
          if (loginButton) loginButton.click();
        }, 500);
        
      } else if (res.data?.action === 'AGENT_HANDOFF') {
        // Trigger agent handoff
        get().addMessage(tab, 'bot', 'text', res.data.speakableText);
        
        // Trigger handoff after message is displayed
        setTimeout(() => {
          const handoffButton = document.querySelector('[data-handoff-trigger]');
          if (handoffButton) handoffButton.click();
        }, 1000);
        
      } else if (res.data) {
        // Normal response with possible confidential data
        const content = {
          speakableText: res.data.speakableText || "Here's the information you requested.",
          ...(res.data.confidentialData && { confidentialData: res.data.confidentialData })
        };
        
        get().addMessage(tab, 'bot', 'structured', content);
      } else {
        // Fallback
        get().addMessage(tab, 'bot', 'text', "I couldn't process that request. Please try again.");
      }
      
    } else {
      // Advisor and Knowledge bots return streaming text
      const text = await response.text();
      get().addMessage(tab, 'bot', 'text', text);
    }
    
  } catch (error) {
    logger.error('Chat processing error', error);
    get().addMessage(tab, 'bot', 'text', 
      error.message || CONFIG.MESSAGES.ERRORS.SERVER_ERROR
    );
  } finally {
    set({ loading: false });
  }
},

// Also add this helper for retrying after login
retryLastMessage: () => {
  const { pendingMessage } = get();
  if (pendingMessage) {
    set({ pendingMessage: null });
    // Small delay to ensure auth state is updated
    setTimeout(() => {
      get().processMessage(pendingMessage.message, pendingMessage.tab, true);
    }, 100);
  }
}