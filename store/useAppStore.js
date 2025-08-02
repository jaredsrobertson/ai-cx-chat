import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { jwtDecode } from 'jwt-decode';
import { v4 as uuidv4 } from 'uuid';
import { BOTS } from '@/lib/bots';
import { CONFIG } from '@/lib/config';

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
    processMessage: async (message, tab) => {
        get().addMessage(tab, 'user', 'text', message);
        set({ loading: true });

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
                    get().addMessage(tab, 'bot', 'text', { speakableText: "Please log in to continue." });
                } else {
                    const payload = res.data.fulfillmentMessages[0]?.payload?.fields;
                    get().addMessage(tab, 'bot', 'structured', payload);
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
            get().processMessage(pendingMessage.message, pendingMessage.tab);
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