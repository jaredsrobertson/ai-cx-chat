// app/page.tsx
'use client';

import dynamic from 'next/dynamic';

// Dynamically import ChatWidget to avoid SSR issues with localStorage
const ChatWidget = dynamic(() => import('@/components/ChatWidget'), {
  ssr: false,
  loading: () => (
    <div className="fixed bottom-6 right-6 z-50">
      <button className="bg-sky-600 text-white rounded-full p-4 shadow-lg animate-pulse">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    </div>
  )
});

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section - Background is now handled by globals.css */}
      <div>
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-shadow-lg">
            AI-Powered Customer Experience Demo
          </h1>
          <p className="text-xl text-sky-200 max-w-3xl mx-auto">
            Showcasing integration of Google Dialogflow and Amazon Lex for intelligent conversational interfaces
          </p>
        </div>
      </div>

      {/* Page Content - Background is now handled by globals.css */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            <FeatureCard 
              title="Google Dialogflow"
              description="Banking assistant with intent recognition, entity extraction, and webhook fulfillment."
              items={['Balance Inquiry', 'Fund Transfers', 'Transaction History', 'Contextual Auth']}
            />
            <FeatureCard 
              title="Amazon Lex V2"
              description="FAQ bot demonstrating AWS integration and natural language understanding."
              items={['Account Support', 'Security Help', 'Quick Replies', 'Agent Handoff']}
            />
            <FeatureCard 
              title="Custom Banking API"
              description="RESTful API demonstrating backend architecture and data management."
              items={['Account Management', 'Transfer Processing', 'Transaction Queries', 'Mock Authentication']}
            />
          </div>

          {/* Technical Stack */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-8 max-w-4xl mx-auto border border-white/20">
            <h2 className="text-2xl font-bold mb-6 text-center text-white">Technical Implementation</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-3 text-sky-300">Frontend</h3>
                <ul className="space-y-2 text-slate-200">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-sky-400 rounded-full mr-3"></span>
                    Next.js 14 with App Router
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-sky-400 rounded-full mr-3"></span>
                    TypeScript for type safety
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-sky-400 rounded-full mr-3"></span>
                    Tailwind CSS for styling
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-sky-400 rounded-full mr-3"></span>
                    Real-time chat interface
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-3 text-sky-300">Backend & Services</h3>
                <ul className="space-y-2 text-slate-200">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-sky-400 rounded-full mr-3"></span>
                    Vercel Edge Functions
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-sky-400 rounded-full mr-3"></span>
                    Dialogflow Webhook Fulfillment
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-sky-400 rounded-full mr-3"></span>
                    AWS SDK Integration
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-sky-400 rounded-full mr-3"></span>
                    AWS Comprehend Sentiment Analysis
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Key Capabilities */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-6 text-white">Key Capabilities</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                'Intent Recognition', 'Entity Extraction', 'Context Management',
                'Session Persistence', 'Quick Replies', 'Sentiment Analysis',
                'Agent Transfer', 'Mobile Responsive', 'Error Recovery'
              ].map((feature) => (
                <span key={feature} className="px-4 py-2 bg-white/10 text-sky-200 rounded-full text-sm font-medium border border-white/20">
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <p className="text-slate-300 mb-4">Try the chat interface in the bottom right corner</p>
            <div className="flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <ChatWidget />
    </main>
  );
}

function FeatureCard({ title, description, items }: { 
  title: string; 
  description: string; 
  items: string[] 
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-white/10">
      <h3 className="text-xl font-bold mb-3 text-sky-300">{title}</h3>
      <p className="text-slate-300 mb-4">{description}</p>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center text-sm text-slate-200">
            <svg className="w-4 h-4 mr-2 text-sky-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}