import Head from 'next/head';
import { useState } from 'react';
import ChatWidget from '@/components/chat/ChatWidget';
import { CloudIcon } from '@/components/ui/Icons';

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#FFFFFF" stroke="#3b82f6" stroke-width="1" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>`;
const faviconDataUri = `data:image/svg+xml;base64,${typeof window !== 'undefined' ? window.btoa(faviconSvg) : Buffer.from(faviconSvg).toString('base64')}`;

export default function Home() {
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  
  const GitHubIcon = (props) => (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
  );

  return (
    <>
      <Head>
        <title>AI-Powered Chat Assistant | Project Demo</title>
        <meta name="description" content="A portfolio project demonstrating a dual-mode AI chat assistant." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href={faviconDataUri} />
      </Head>
      
      <div className="scroll-container">
        <header className="sticky top-0 z-20 nav-footer border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-brand-blue rounded-lg flex items-center justify-center shadow-md">
                  <CloudIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">CloudBank</h1>
              </div>
              <nav className="hidden md:flex items-center space-x-6">
                <a href="#tech" className="text-gray-200 hover:text-white font-medium">Technology</a>
                <a href="#features" className="text-gray-200 hover:text-white font-medium">AI Features</a>
                <button className="btn-primary" data-chat-toggle="true">Try AI Chat</button>
              </nav>
            </div>
          </div>
        </header>

        <main className="pb-16">
          <section id="demo" className="scroll-section h-screen flex items-center justify-center text-white">
            <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h2 className="text-6xl font-bold mb-6 leading-tight">Dual-Mode AI Assistant</h2>
                <p className="text-xl mb-8 text-blue-100 leading-relaxed max-w-3xl mx-auto">
                  A technical demonstration of a custom conversational AI solution, integrating task-oriented dialogue with generative AI for a modern customer experience.
                </p>
                <div className="flex justify-center gap-4">
                  <button className="btn-primary bg-white text-brand-blue hover:bg-gray-200" data-chat-toggle="true">Try AI Chat</button>
                  <button onClick={() => setShowGitHubModal(true)} className="bg-white/10 text-white font-medium px-6 py-2.5 rounded-lg border border-white/20 hover:bg-white/20 flex items-center justify-center gap-2">
                    <GitHubIcon className="w-5 h-5" />
                    View on GitHub
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section id="tech" className="scroll-section h-screen flex items-center justify-center">
            <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="card">
                <div className="text-center mb-12">
                  <h3 className="text-4xl font-bold text-gray-900 mb-4">Built with Modern Technology</h3>
                  <p className="text-xl text-gray-600">This demo showcases an enterprise-grade AI architecture.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="text-center"><h4 className="text-xl font-bold text-gray-900 mb-2">Google Dialogflow</h4><p className="text-gray-600">For NLU and stateful, task-oriented dialogue.</p></div>
                  <div className="text-center"><h4 className="text-xl font-bold text-gray-900 mb-2">OpenAI GPT-4</h4><p className="text-gray-600">For generative, open-ended conversational ability.</p></div>
                  <div className="text-center"><h4 className="text-xl font-bold text-gray-900 mb-2">Full-Stack Next.js</h4><p className="text-gray-600">With serverless API routes, JWT auth, and Vercel KV rate-limiting.</p></div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-20 nav-footer border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center text-xs text-gray-800">
            <p className="text-white">&copy; 2024 Jared S. Robertson</p>
            <p className="text-center font-medium text-gray-300">This is a portfolio project and not affiliated with any real entity.</p>
            <a href="mailto:jared.s.robertson@example.com" className="text-white hover:underline">jared.s.robertson@example.com</a>
          </div>
        </div>
      </footer>

      <ChatWidget />
      
      {showGitHubModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gray-50 rounded-xl p-8 max-w-md w-full mx-4 animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4"><GitHubIcon className="w-8 h-8 text-white"/></div>
              <h2 className="text-2xl font-bold text-gray-900">View Project on GitHub</h2>
              <p className="text-gray-600 mt-2">The repository contains the complete source code for this demo.</p>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setShowGitHubModal(false)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={() => { window.open('https://github.com/jaredsrobertson/ai-cx-chat', '_blank'); setShowGitHubModal(false); }} className="flex-1 btn-primary">Open GitHub</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}