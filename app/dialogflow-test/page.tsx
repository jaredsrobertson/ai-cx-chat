// app/dialogflow-test/page.tsx
'use client';

import { useState, useEffect } from 'react';
import DialogflowClient from '@/lib/dialogflow-client';

export default function DialogflowTestPage() {
  const [client, setClient] = useState<DialogflowClient | null>(null);
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean, quickReplies?: string[], payload?: any}>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const dfClient = new DialogflowClient();
    setClient(dfClient);
    setSessionId(dfClient.getSessionId());
    setAuthenticated(dfClient.isAuthenticated());
  }, []);

  const sendMessage = async (text: string) => {
    if (!client || !text.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { text, isUser: true }]);
    setInput('');
    setLoading(true);

    try {
      const response = await client.sendMessage(text);
      
      // Parse response
      const botText = response.queryResult.fulfillmentText;
      const quickReplies = client.parseQuickReplies(response.queryResult.fulfillmentMessages);
      const payload = client.parsePayload(response.queryResult.fulfillmentMessages);

      // Check for auth requirement
      if (payload?.action === 'REQUIRE_AUTH') {
        // Simulate authentication
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            text: '🔐 Authentication required. Click "Login" to continue.', 
            isUser: false,
            payload
          }]);
        }, 500);
      } else if (payload?.action === 'TRANSFER_AGENT') {
        setMessages(prev => [...prev, { 
          text: '👤 Transferring to live agent...', 
          isUser: false,
          payload
        }]);
      } else {
        // Add bot message with quick replies
        setMessages(prev => [...prev, { 
          text: botText, 
          isUser: false, 
          quickReplies 
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        text: 'Sorry, I encountered an error. Please try again.', 
        isUser: false 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!client) return;
    
    // Simulate authentication
    client.setAuthenticated(true);
    setAuthenticated(true);
    
    // Send success message
    setMessages(prev => [...prev, { 
      text: '✅ Successfully authenticated as demo@bank.com', 
      isUser: false 
    }]);
    
    // Trigger authenticated context
    sendMessage('I am now authenticated');
  };

  const clearSession = () => {
    if (!client) return;
    
    client.clearSession();
    setSessionId(client.getSessionId());
    setAuthenticated(false);
    setMessages([]);
    client.setAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Dialogflow Integration Test</h1>
        
        {/* Session Info */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Session ID: <code className="bg-gray-100 px-2 py-1 rounded">{sessionId}</code></p>
              <p className="text-sm text-gray-600">Authenticated: <span className={authenticated ? 'text-green-600' : 'text-red-600'}>{authenticated ? 'Yes' : 'No'}</span></p>
            </div>
            <button
              onClick={clearSession}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear Session
            </button>
          </div>
        </div>

        {/* Quick Test Buttons */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <p className="text-sm font-semibold mb-2">Quick Tests:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => sendMessage('hi')}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Welcome
            </button>
            <button
              onClick={() => sendMessage('check my balance')}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Check Balance
            </button>
            <button
              onClick={() => sendMessage('transfer $100 from checking to savings')}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Transfer (Full)
            </button>
            <button
              onClick={() => sendMessage('transfer money')}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Transfer (Partial)
            </button>
            <button
              onClick={() => sendMessage('show recent transactions')}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Transactions
            </button>
            <button
              onClick={() => sendMessage('talk to an agent')}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Request Agent
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-400 text-center">No messages yet. Try sending a message!</p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div key={index}>
                  <div className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-md px-4 py-2 rounded-lg ${
                      msg.isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
                    }`}>
                      <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
                    </div>
                  </div>
                  
                  {/* Show auth button if needed */}
                  {msg.payload?.action === 'REQUIRE_AUTH' && !authenticated && (
                    <div className="flex justify-start mt-2">
                      <button
                        onClick={handleLogin}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Login as demo@bank.com
                      </button>
                    </div>
                  )}
                  
                  {/* Show quick replies */}
                  {msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.quickReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          onClick={() => sendMessage(reply)}
                          className="px-3 py-1 bg-white border border-blue-500 text-blue-500 rounded hover:bg-blue-50"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 px-4 py-2 rounded-lg">
                    <span className="animate-pulse">Bot is typing...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Testing Instructions:</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Start with "hi" to test the welcome intent</li>
            <li>Try "check my balance" - it should ask for authentication</li>
            <li>Click the "Login" button when prompted</li>
            <li>Try the same command again - it should now show balances</li>
            <li>Test transfer with full params: "transfer $100 from checking to savings"</li>
            <li>Test partial transfer: "transfer money" (bot should ask for details)</li>
            <li>Quick replies should appear after bot responses</li>
          </ol>
        </div>
      </div>
    </div>
  );
}