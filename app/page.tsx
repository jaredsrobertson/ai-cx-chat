// app/page.tsx
'use client';

import dynamic from 'next/dynamic';
import CloudIcon from '@/components/CloudIcon';

// Dynamically import ChatWidget to avoid SSR issues
const ChatWidget = dynamic(() => import('@/components/ChatWidget'), { ssr: false });

export default function Home() {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-10 bg-white/30 backdrop-blur-md">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CloudIcon className="w-8 h-8 text-slate-800" />
            <span className="font-semibold text-lg text-slate-800">AI CX Demo</span>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section 
          className="relative h-[90vh] flex items-center justify-center bg-cover bg-center bg-fixed" 
          style={{ backgroundImage: "url('/clouds.jpg')" }}
        >
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative text-center px-4 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white text-shadow-md mb-4">
              Conversational AI Platform
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto mb-8">
              An intelligent, responsive chat application demonstrating a modern customer experience powered by leading AI platforms and a custom backend.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-white/90 text-sm">
              <span className="flex items-center gap-2"><CheckIcon/> Google Dialogflow</span>
              <span className="flex items-center gap-2"><CheckIcon/> Amazon Lex</span>
              <span className="flex items-center gap-2"><CheckIcon/> Webhook Fulfillment</span>
              <span className="flex items-center gap-2"><CheckIcon/> Custom REST API</span>
            </div>
          </div>
        </section>

        {/* Scroll Indicator Section */}
        <div className="h-[10vh] flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
        </div>

        {/* Content Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
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
            <div className="bg-white/60 backdrop-blur-lg rounded-xl shadow-lg p-8 max-w-4xl mx-auto border border-white/30">
              <h2 className="text-3xl font-bold mb-6 text-center text-slate-800">Technical Stack</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold text-lg mb-3 text-slate-700">Frontend</h3>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-center"><Pill /> Next.js 14 with App Router</li>
                    <li className="flex items-center"><Pill /> TypeScript for type safety</li>
                    <li className="flex items-center"><Pill /> Tailwind CSS for styling</li>
                    <li className="flex items-center"><Pill /> Real-time chat interface</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-3 text-slate-700">Backend & Services</h3>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-center"><Pill /> Vercel Edge Functions</li>
                    <li className="flex items-center"><Pill /> Dialogflow Webhook Fulfillment</li>
                    <li className="flex items-center"><Pill /> AWS SDK Integration</li>
                    <li className="flex items-center"><Pill /> AWS Comprehend (Mocked)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ChatWidget />
      </main>
    </>
  );
}

function FeatureCard({ title, description, items }: { title: string; description: string; items: string[] }) {
  return (
    <div className="bg-white/50 backdrop-blur-lg rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow border border-white/20">
      <h3 className="text-xl font-bold mb-3 text-slate-800">{title}</h3>
      <p className="text-slate-600 mb-4">{description}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-center text-sm text-slate-700">
            <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const Pill = () => <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>;

const CheckIcon = () => (
  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);