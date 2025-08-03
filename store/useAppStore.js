import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { jwtDecode } from 'jwt-decode';
import { v4 as uuidv4 } from 'uuid';
import { BOTS } from '@/lib/bots';
import { CONFIG } from '@/lib/config';

// --- Helper function to parse Dialogflow's Struct format ---
function parseDialogflowResponse(fields) {
  if (!fields) return null;
  const result = {};
  for (const key in fields) {
    const value = fields[key];
    const valueType = Object.keys(value)[0];
    switch (valueType) {
      case 'stringValue':
      case 'numberValue':
      case 'boolValue':
        result[key] = value[valueType];
        break;
      case 'structValue':
        result[key] = parseDialogflowResponse(value[valueType].fields);
        break;
      case 'listValue':
        result[key] = value[valueType].values.map(item => parseDialogflowResponse(item.structValue.fields));
        break;
      default:
        result[key] = null;
        break;
    }
  }
  return result;
}


const initialMessages = {
  banking: [{ ...BOTS.banking.initialMessage }],
  advisor: [{ ...BOTS.advisor.initialMessage }],
  knowledge: [{ ...BOTS.knowledge.initialMessage }]
};

// --- Auth Slice ---
const createAuthSlice = (set, get) => ({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    theme: 'light',
    toggleTheme: () => set(state => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        return { theme: newTheme };
    }),
    login: async (username, pin) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, pin }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                localStorage.setItem('authToken', data.data.token);
                set({ user: data.data.user, isAuthenticated: true });
                return { success: true };
            }
            return { success: false, error: data.error || 'Login failed' };
        } catch (error) {
            logger.error('Login network error', error);
            return { success: false, error: 'A network error occurred.' };
        }
    },
    logout: () => {
        localStorage.removeItem('authToken');
        set({ user: null, isAuthenticated: false });
    },
    verifyToken: async () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            set({ isLoading: false });
            return;
        }
        try {
            const decoded = jwtDecode(token);
            if (decoded.exp < Date.now() / 1000) {
                get().logout();
                return;
            }
            const response = await fetch('/api/auth/verify', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const data = await response.json();
                if (data.success) set({ user: data.data.user, isAuthenticated: true });
                else get().logout();
            } else {
                get().logout();
            }
        } catch (error) {
            logger.error('Auth verification error', error);
            get().logout();
        } finally {
            set({ isLoading: false });
        }
    },
});

// --- Chat Slice ---
const createChatSlice = (set, get) => ({
    messages: initialMessages,
    loading: false,
    pendingMessage: null,
    addMessage: (tab, author, type, content, id = uuidv4()) => {
        set(state => ({
            messages: {
                ...state.messages,
                [tab]: [...(state.messages[tab] || []), { id, author, type, content, timestamp: new Date() }]
            }
        }));
        return id;
    },
    processMessage: async (message, tab, isRetry = false) => {
        if (!isRetry) {
          get().addMessage(tab, 'user', 'text', message);
        }
        set({ loading: true });

        // Fire-and-forget analytics call
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
                    // The streamed object might have multiple parts, parse the final complete one
                    const finalJson = JSON.parse(result.trim().split('\n').pop());
                    get().addAnalyticsEntry(finalJson);
                }
            } catch (error) {
                logger.warn('Could not analyze message', error);
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
                        content: (typeof msg.content === 'object' && msg.content !== null) ? msg.content.speakableText : msg.content
                    }))
                }),
            });

            if (!response.ok) {
                 const errData = await response.json().catch(() => ({}));
                 throw new Error(errData.error || 'An API error occurred.');
            }

            if (tab === 'banking') {
                const res = await response.json();
                if (res.data.action === 'AUTH_REQUIRED') {
                    set({ pendingMessage: { message, tab } });
                    get().addMessage(tab, 'bot', 'text', "Please log in to continue.");
                } else {
                    const payload = res.data.fulfillmentMessages[0]?.payload?.fields;
                    const parsedPayload = parseDialogflowResponse(payload);
                    get().addMessage(tab, 'bot', 'structured', parsedPayload);
                }
            } else {
                const text = await response.text();
                get().addMessage(tab, 'bot', 'text', { speakableText: text });
            }
        } catch (error) {
            logger.error('Chat processing error', error);
            get().addMessage(tab, 'bot', 'text', { speakableText: error.message || CONFIG.MESSAGES.ERRORS.SERVER_ERROR });
        } finally {
            set({ loading: false });
        }
    },
    retryLastMessage: () => {
        const { pendingMessage } = get();
        if (pendingMessage) {
            set({ pendingMessage: null });
            // Call processMessage again, but flag it as a retry
            get().processMessage(pendingMessage.message, pendingMessage.tab, true);
        }
    }
});

// --- Analytics Slice ---
const createAnalyticsSlice = (set, get) => ({
    analytics: [],
    latestAnalytics: { intent: 'N/A', sentiment: 'N/A' },
    addAnalyticsEntry: (entry) => {
        const newEntry = { ...entry, id: uuidv4(), timestamp: new Date() };
        set(state => ({
            analytics: [newEntry, ...state.analytics].slice(0, 10),
            latestAnalytics: { intent: entry.intent, sentiment: entry.sentiment }
        }));
    },
});


export const useAppStore = create((set, get) => ({
    ...createAuthSlice(set, get),
    ...createChatSlice(set, get),
    ...createAnalyticsSlice(set, get),
}));

// This check ensures that the token verification only runs in the browser environment.
if (typeof window !== 'undefined') {
    useAppStore.getState().verifyToken();
}