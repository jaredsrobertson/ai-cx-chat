// app/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import CloudIcon from '@/components/CloudIcon';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

// Dynamically import ChatWidget to avoid SSR issues
const ChatWidget = dynamic(() => import('@/components/ChatWidget'), { ssr: false });

export default function Home() {
  // Use the custom hook to handle scroll animations for sections further down
  useScrollAnimation();

  // Animation Sequence State
  // 0: Initial (Hidden)
  // 1: Hero Fade In (T+100ms)
  // 2: Buttons & FAB Fade In (T+200ms)
  // 3: Flash & Ping Trigger (T+210ms)
  const [animStage, setAnimStage] = useState(0);

  useEffect(() => {
    // Stage 1: Hero Fade In (100ms)
    const timer1 = setTimeout(() => setAnimStage(1), 100);
    
    // Stage 2: Buttons Fade In (200ms)
    const timer2 = setTimeout(() => setAnimStage(2), 200);

    // Stage 3: Flash Trigger (210ms - 10ms after buttons appear)
    const timer3 = setTimeout(() => setAnimStage(3), 210);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const openChatWidget = () => {
    const chatButton = document.querySelector('[class*="fixed bottom-6 right-6"]') as HTMLButtonElement;
    if (chatButton) {
      chatButton.click();
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes flash-highlight {
          0%, 100% { background-color: rgb(37 99 235); transform: scale(1); }
          50% { background-color: rgb(96 165 250); transform: scale(1.05); box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); }
        }
        .animate-flash-once {
          animation: flash-highlight 0.4s ease-out forwards;
        }
      `}</style>

      {/* Fixed Background */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-200 to-blue-200 z-0" />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-20 bg-white/10 backdrop-blur-md border-b border-slate-200/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CloudIcon className="w-8 h-8 text-blue-600" />
            <span className="font-bold text-lg text-slate-600">AI CX Demo</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#features" className="hidden md:inline text-slate-600 hover:text-blue-600 transition-colors">Features</a>
            <a href="#tech-stack" className="hidden md:inline text-slate-600 hover:text-blue-600 transition-colors">Tech Stack</a>
            <button 
              onClick={openChatWidget}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
            >
              Try Chat Demo
            </button>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-5xl mx-auto text-center py-20">
            {/* Hero Text Container - Fades in at Stage 1 */}
            <div className={`transition-opacity duration-700 ease-out ${animStage >= 1 ? 'opacity-100' : 'opacity-0'}`}>
              <h1 className="text-4xl md:text-6xl font-bold text-slate-700 mb-6">
                AI-Powered Customer Experience Demo
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                This project demonstrates a production-ready conversational AI platform powered by Google Dialogflow. 
                Built with Next.js, it showcases advanced features including intent recognition, entity extraction, 
                webhook fulfillment, context management, and knowledge base integration for intelligent, dynamic conversations.
              </p>
              
              {/* Key Features */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm md:text-base text-slate-700 mb-8">
                <span className="flex items-center gap-2">
                  <CheckIcon /> Google Dialogflow CX
                </span>
                <span className="flex items-center gap-2">
                  <CheckIcon /> Webhook Fulfillment
                </span>
                <span className="flex items-center gap-2">
                  <CheckIcon /> Knowledge Base
                </span>
                <span className="flex items-center gap-2">
                  <CheckIcon /> Custom REST API
                </span>
              </div>
            </div>

            {/* CTA Buttons - Fades in at Stage 2 */}
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-opacity duration-700 ease-out ${animStage >= 2 ? 'opacity-100' : 'opacity-0'}`}>
              <button 
                onClick={openChatWidget}
                // Applies 'animate-flash-once' only when Stage 3 is reached
                className={`px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg ${animStage === 3 ? 'animate-flash-once' : ''}`}>
                Launch Chat Demo
              </button>
              
              <a 
                href="https://github.com/jaredsrobertson/ai-cx-chat"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-white text-slate-700 border border-slate-300 rounded-lg font-semibold hover:bg-slate-50 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-700 mb-12 scroll-animate">
              Key Features
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Dialogflow Intents Card */}
              <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 scroll-animate text-center md:text-left">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto md:mx-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Intent Recognition & NLU</h3>
                <p className="text-slate-600 mb-4">
                  Dialogflow's advanced Natural Language Understanding identifies user intents with high accuracy. 
                  Extracts entities, handles variations, and maintains conversation context across multiple turns.
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>• Custom Intent Training</li>
                  <li>• Entity Extraction</li>
                  <li>• Context Management</li>
                  <li>• Multi-turn Conversations</li>
                </ul>
              </div>

              {/* Webhook Fulfillment Card */}
              <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 scroll-animate text-center md:text-left" style={{animationDelay: '0.1s'}}>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto md:mx-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Webhook Fulfillment</h3>
                <p className="text-slate-600 mb-4">
                  Custom webhook integration enables dynamic responses by connecting Dialogflow to backend services. 
                  Processes transactions, queries databases, and implements complex business logic in real-time.
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>• Real-time API Integration</li>
                  <li>• Dynamic Response Generation</li>
                  <li>• Business Logic Processing</li>
                  <li>• Secure Authentication Flow</li>
                </ul>
              </div>

              {/* Knowledge Base Card */}
              <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 scroll-animate text-center md:text-left" style={{animationDelay: '0.2s'}}>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto md:mx-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Knowledge Base Integration</h3>
                <p className="text-slate-600 mb-4">
                  Dialogflow Knowledge Base provides intelligent FAQ responses from unstructured documents. 
                  Automatically generates answers, handles variations, and improves over time with machine learning.
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>• Document-based Answers</li>
                  <li>• CSV/HTML Support</li>
                  <li>• Automatic Response Generation</li>
                  <li>• Confidence Scoring</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section id="tech-stack" className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-700 mb-12 scroll-animate">
              Technical Stack
            </h2>
            
            <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-sm rounded-lg p-8 scroll-animate text-center md:text-left">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-lg mb-4 text-slate-800">Frontend</h3>
                  <ul className="space-y-3 text-slate-600">
                    <li className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      Next.js 14 with App Router
                    </li>
                    <li className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      React 19 with TypeScript
                    </li>
                    <li className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      Tailwind CSS for styling
                    </li>
                    <li className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      Zustand state management
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-4 text-slate-800">Backend & AI</h3>
                  <ul className="space-y-3 text-slate-600">
                    <li className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      Google Dialogflow CX/ES
                    </li>
                    <li className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      Dialogflow Node.js SDK
                    </li>
                    <li className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      NextAuth.js Authentication
                    </li>
                    <li className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      Custom REST API with Next.js
                    </li>
                  </ul>
                </div>
              </div>
              
              {/* Implementation Highlights */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h4 className="font-semibold text-sm text-slate-700 mb-3">Implementation Highlights</h4>
                <div className="flex flex-wrap gap-3 text-sm justify-center md:justify-start">
                  <span className="px-3 py-1 bg-white rounded-full text-slate-700">Intent Detection</span>
                  <span className="px-3 py-1 bg-white rounded-full text-slate-700">Entity Extraction</span>
                  <span className="px-3 py-1 bg-white rounded-full text-slate-700">Webhook Fulfillment</span>
                  <span className="px-3 py-1 bg-white rounded-full text-slate-700">Context Management</span>
                  <span className="px-3 py-1 bg-white rounded-full text-slate-700">Knowledge Base</span>
                  <span className="px-3 py-1 bg-white rounded-full text-slate-700">Session Persistence</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 bg-white/10 backdrop-blur-md border-b border-slate-200/50">
          <div className="container mx-auto px-4 text-center">
            <p className="text-slate-600">
              © 2025 AI CX Demo • Built with Next.js and Google Dialogflow
            </p>
          </div>
        </footer>
      </main>

      <ChatWidget />
    </>
  );
}

const CheckIcon = () => (
  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);