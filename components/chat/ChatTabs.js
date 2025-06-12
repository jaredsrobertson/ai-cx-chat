import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function ChatTabs({ activeTab, onLoginRequired }) {
  const [messages, setMessages] = useState({
    banking: [
      { id: 1, text: "Hi! I'm your SecureBank assistant. I can help you check balances, transfer funds, and answer banking questions. How can I assist you today?", sender: 'bot', timestamp: new Date() }
    ],
    advisor: [
      { id: 1, text: "Hello! I'm your personal financial advisor. I can help with budgeting tips, investment advice, savings strategies, and financial planning. What would you like to discuss?", sender: 'bot', timestamp: new Date() }
    ]
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const messagesEndRef = useRef(null);
  const { user, isAuthenticated } = useAuth();

  // Only log on component mount, not on every render
  useEffect(() => {
    console.log('ChatTabs mounted - User:', user);
    console.log('ChatTabs mounted - IsAuthenticated:', isAuthenticated);
  }, [user, isAuthenticated]); // Watch for auth changes

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle pending request after login
  useEffect(() => {
    if (user && pendingRequest) {
      console.log('🔄 User logged in, processing pending request:', pendingRequest);
      processPendingRequest();
    }
  }, [user, pendingRequest]); // Watch for user changes

  const processPendingRequest = async () => {
    if (!pendingRequest) return;
    
    const requestToProcess = pendingRequest;
    setPendingRequest(null);
    
    console.log('Processing request:', requestToProcess);
    setIsLoading(true);
    
    try {
      const endpoint = activeTab === 'banking' ? '/api/chat/banking' : '/api/chat/financial-advisor';
      const token = localStorage.getItem('authToken');
      
      console.log('Making API call with token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ message: requestToProcess })
      });

      const data = await response.json();
      console.log('API Response:', data);

      const botMessage = {
        id: Date.now(),
        text: data.response || getDefaultResponse(activeTab, requestToProcess),
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], botMessage]
      }));
    } catch (error) {
      console.error('Error processing request:', error);
      const errorMessage = {
        id: Date.now(),
        text: getDefaultResponse(activeTab, requestToProcess),
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], errorMessage]
      }));
    }

    setIsLoading(false);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    console.log('Sending message:', inputMessage);
    console.log('User authenticated:', isAuthenticated);
    console.log('Active tab:', activeTab);

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], userMessage]
    }));
    
    setInputMessage('');
    setIsLoading(true);

    // Check if banking request requires authentication (only if user is NOT logged in)
    if (activeTab === 'banking' && requiresAuth(inputMessage) && !isAuthenticated) {
      console.log('Auth required, opening login modal');
      const authMessage = {
        id: Date.now() + 1,
        text: "I'd be happy to help you with your account information! For security purposes, please log in to access your account details.",
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], authMessage]
      }));
      
      // Store the pending request to process after login
      setPendingRequest(inputMessage);
      setIsLoading(false);
      onLoginRequired();
      return;
    }

    // Process the message immediately if authenticated or if no auth required
    try {
      const endpoint = activeTab === 'banking' ? '/api/chat/banking' : '/api/chat/financial-advisor';
      const token = localStorage.getItem('authToken');
      
      console.log('Making direct API call, token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ message: inputMessage })
      });

      const data = await response.json();
      console.log('Direct API Response:', data);

      const botMessage = {
        id: Date.now() + 1,
        text: data.response || getDefaultResponse(activeTab, inputMessage),
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], botMessage]
      }));
    } catch (error) {
      console.error('Direct API call error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: getDefaultResponse(activeTab, inputMessage),
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], errorMessage]
      }));
    }

    setIsLoading(false);
  };

  const requiresAuth = (message) => {
    const authKeywords = ['balance', 'transfer', 'account', 'payment', 'statement', 'history', 'transactions'];
    return authKeywords.some(keyword => message.toLowerCase().includes(keyword));
  };

  const getDefaultResponse = (tab, message) => {
    if (tab === 'banking') {
      if (message.toLowerCase().includes('balance')) {
        return user 
          ? `Your account balances are:\n• Checking: ${user.accounts.checking.balance.toLocaleString()}\n• Savings: ${user.accounts.savings.balance.toLocaleString()}`
          : "Please log in to view your account balance.";
      }
      if (message.toLowerCase().includes('transfer')) {
        return user 
          ? "I can help you transfer funds between your accounts. How much would you like to transfer and between which accounts?"
          : "Please log in to access transfer services.";
      }
      if (message.toLowerCase().includes('hours') || message.toLowerCase().includes('location')) {
        return "Our branches are open Monday-Friday 9AM-5PM, Saturday 9AM-2PM. You can find locations using our branch locator on the website.";
      }
      return "I'm here to help with your banking needs! You can ask about account balances, transfers, payments, or general banking questions.";
    } else {
      if (message.toLowerCase().includes('budget')) {
        return "Great question about budgeting! The 50/30/20 rule is a popular approach: 50% for needs, 30% for wants, and 20% for savings and debt repayment. Would you like me to explain this in more detail?";
      }
      if (message.toLowerCase().includes('invest')) {
        return "Investment strategies depend on your goals and risk tolerance. Generally, diversification across asset classes is key. Consider starting with low-cost index funds if you're new to investing. What's your investment timeline?";
      }
      if (message.toLowerCase().includes('save')) {
        return "Building an emergency fund should be your first priority - aim for 3-6 months of expenses. After that, consider high-yield savings accounts and investment options based on your goals.";
      }
      return "I'm here to provide financial guidance! Ask me about budgeting, investing, saving strategies, debt management, or any other financial planning topics.";
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full max-h-[400px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-messages">
        {messages[activeTab].map((message) => (
          <div
            key={message.id}
            className={`chat-message ${message.sender}`}
          >
            <p className="text-sm">{message.text}</p>
            <span className="text-xs opacity-70 mt-1 block">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        
        {isLoading && (
          <div className="chat-message bot">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs text-gray-500">Typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask your ${activeTab === 'banking' ? 'banking' : 'financial'} question...`}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-banking-blue focus:border-transparent outline-none text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-banking-blue text-white rounded-lg hover:bg-banking-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}