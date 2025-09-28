// app/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import CloudIcon from '@/components/CloudIcon';

// Dynamically import ChatWidget to avoid SSR issues
const ChatWidget = dynamic(() => import('@/components/ChatWidget'), { ssr: false });

export default function Home() {
  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up');
        }
      });
    }, { 
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    const elements = document.querySelectorAll('.scroll-animate');
    elements.forEach(el => observer.observe(el));
    
    return () => {
      elements.forEach(el => observer.unobserve(el));
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
            <h1 className="text-4xl md:text-6xl font-bold text-slate-700 mb-6 scroll-animate">
              AI-Powered Customer Experience Demo
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed scroll-animate">
              This project demonstrates a modern, AI-powered customer experience solution. 
              It features a conversational chat application that integrates with multiple leading AI platforms 
              and a custom backend. Built with Next.js, showcasing real-world scenarios like authentication, 
              API integration, and dynamic response generation.
            </p>
            
            {/* Key Features */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm md:text-base text-slate-700 mb-8 scroll-animate">
              <span className="flex items-center gap-2">
                <CheckIcon /> Google Dialogflow
              </span>
              <span className="flex items-center gap-2">
                <CheckIcon /> Amazon Lex
              </span>
              <span className="flex items-center gap-2">
                <CheckIcon /> Webhook Fulfillment
              </span>
              <span className="flex items-center gap-2">
                <CheckIcon /> Custom REST API
              </span>
            </div>

            {/* Hero CTA Button */}
            <button 
              onClick={openChatWidget}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg scroll-animate">
              Launch Chat Demo
            </button>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-700 mb-12 scroll-animate">
              Key Features
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Dialogflow Card */}
              <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 scroll-animate text-center md:text-left">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto md:mx-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Google Dialogflow</h3>
                <p className="text-slate-600 mb-4">
                  Banking assistant with webhook fulfillment for dynamic responses. Handles balance inquiries, 
                  fund transfers, and transaction history with contextual authentication.
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>• Balance Inquiry</li>
                  <li>• Fund Transfers</li>
                  <li>• Transaction History</li>
                  <li>• Contextual Auth</li>
                </ul>
              </div>

              {/* Lex Card */}
              <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 scroll-animate text-center md:text-left" style={{animationDelay: '0.1s'}}>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto md:mx-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Amazon Lex V2</h3>
                <p className="text-slate-600 mb-4">
                  FAQ and customer support bot integrated through AWS SDK. Provides quick replies, 
                  confidence scoring, and seamless agent handoff capabilities.
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>• Account Support</li>
                  <li>• Security Help</li>
                  <li>• Quick Replies</li>
                  <li>• Agent Handoff</li>
                </ul>
              </div>

              {/* API Card */}
              <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 scroll-animate text-center md:text-left" style={{animationDelay: '0.2s'}}>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto md:mx-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Custom Banking API</h3>
                <p className="text-slate-600 mb-4">
                  RESTful API built with Next.js API routes. Features token-based authentication 
                  and provides endpoints for account data, transactions, and transfers.
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>• Account Management</li>
                  <li>• Transfer Processing</li>
                  <li>• Transaction Queries</li>
                  <li>• Mock Authentication</li>
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
                      TypeScript for type safety
                    </li>
                    <li className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      Tailwind CSS for styling
                    </li>
                    <li className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      Real-time chat interface
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-4 text-slate-800">Backend & Services</h3>
                  <ul className="space-y-3 text-slate-600">
                    <li className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      Vercel Edge Functions
                    </li>
                    <li className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      Dialogflow Webhook Fulfillment
                    </li>
                    <li className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      AWS SDK Integration
                    </li>
                    <li className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      Token-based Authentication
                    </li>
                  </ul>
                </div>
              </div>
              
              {/* Implementation Highlights */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h4 className="font-semibold text-sm text-slate-700 mb-3">Implementation Highlights</h4>
                <div className="flex flex-wrap gap-3 text-sm justify-center md:justify-start">
                  <span className="px-3 py-1 bg-white rounded-full text-slate-700">Webhook Fulfillment</span>
                  <span className="px-3 py-1 bg-white rounded-full text-slate-700">Context Management</span>
                  <span className="px-3 py-1 bg-white rounded-full text-slate-700">Session Persistence</span>
                  <span className="px-3 py-1 bg-white rounded-full text-slate-700">Real-time Updates</span>
                  <span className="px-3 py-1 bg-white rounded-full text-slate-700">Mobile Responsive</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 bg-white/10 backdrop-blur-md border-b border-slate-200/50">
          <div className="container mx-auto px-4 text-center">
            <p className="text-slate-600">
              © 2025 AI CX Demo • Built with Next.js, Dialogflow, and Amazon Lex
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