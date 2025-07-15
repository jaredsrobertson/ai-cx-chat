import Head from 'next/head';
import { useState } from 'react';
import ChatWidget from '@/components/chat/ChatWidget';
import { HiCloud } from 'react-icons/hi2';
import { FaGithub } from 'react-icons/fa';

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
    <path fill-rule="evenodd" d="M4.5 9.75a6 6 0 0 1 11.573-2.226 3.75 3.75 0 0 1 4.133 4.303A4.5 4.5 0 0 1 18 20.25H6.75a5.25 5.25 0 0 1-2.23-10.004 6.072 6.072 0 0 1-.02-.496Z" clip-rule="evenodd"></path>
</svg>`;

const faviconDataUri = `data:image/svg+xml;base64,${typeof window !== 'undefined' ? window.btoa(faviconSvg) : Buffer.from(faviconSvg).toString('base64')}`;

export default function Home() {
  const [showGitHubModal, setShowGitHubModal] = useState(false);

  return (
    <>
      <Head>
        <title>AI-Powered CX Chat Demo</title>
        <meta name="description" content="A technical demonstration of a modern conversational AI solution, combining Dialogflow-style fulfillment with generative AI." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href={faviconDataUri} />
      </Head>

      <div className="min-h-screen">
        {/* Fixed header container */}
        <div className="header-container">
          <header className="h-full flex items-center nav-footer">
            {/* This div is now full-width with padding */}
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
                    <HiCloud className="w-6 h-6 text-brand-blue" />
                  </div>
                  <h1 className="text-2xl font-bold text-white">CloudBank</h1>
                </div>
                <nav className="hidden md:flex items-center space-x-6">
                  <a href="#ai-architecture" className="text-gray-200 hover:text-white font-medium">AI Architecture</a>
                  <a href="#tech-stack" className="text-gray-200 hover:text-white font-medium">Tech Stack</a>
                  <button className="btn-primary bg-white text-brand-blue hover:bg-gray-200" data-chat-toggle="true">Try AI Chat</button>
                </nav>
              </div>
            </div>
          </header>
        </div>

        {/* Scrollable content container */}
        <div className="content-container">
          <main>
            <section id="demo" className="scroll-section">
              <div className="text-center">
                <h2 className="text-6xl font-bold mb-6 leading-tight text-white">
                    AI-Powered Customer Experience
                    <span className="block">Chat Demo</span>
                </h2>
                <p className="text-xl mb-8 text-blue-100 leading-relaxed max-w-3xl mx-auto">
                  A technical demonstration of a modern conversational AI solution, showcasing how structured, Dialogflow-style fulfillment can be combined with generative AI.
                </p>
                <div className="flex justify-center gap-4">
                  <button className="btn-primary bg-white text-brand-blue hover:bg-gray-200" data-chat-toggle="true">Try AI Chat</button>
                  <button onClick={() => setShowGitHubModal(true)} className="bg-white/10 text-white font-medium px-6 py-2.5 rounded-lg border border-white/20 hover:bg-white/20 flex items-center justify-center gap-2">
                    <FaGithub className="w-5 h-5" />
                    View on GitHub
                  </button>
                </div>
              </div>
            </section>

            <section id="ai-architecture" className="scroll-section">
                <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="card">
                    <div className="text-center mb-12">
                      <h3 className="text-4xl font-bold text-brand-text-primary mb-4">Dual AI Bot Architecture</h3>
                      <p className="text-xl text-brand-text-secondary">Combining structured, task-oriented dialogue with flexible, generative conversation.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                      <div className="text-center">
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Stateful Dialogue & NLU</h4>
                        <p className="text-gray-600">Using **Google Dialogflow** for robust intent classification, entity extraction, and managing conversational context for banking tasks.</p>
                      </div>
                      <div className="text-center">
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Generative Conversation</h4>
                        <p className="text-gray-600">Leveraging the **OpenAI GPT-4** model to provide open-ended, human-like financial advice that goes beyond pre-defined scripts.</p>
                      </div>
                      <div className="text-center">
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Voice-Enabled Experience</h4>
                        <p className="text-gray-600">Integrating browser-native **Speech Recognition (ASR)** and dynamic **Text-to-Speech (TTS via ElevenLabs)** to create a complete voice experience.</p>
                      </div>
                    </div>
                  </div>
                </div>
            </section>

            <section id="tech-stack" className="scroll-section">
                <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="card">
                    <div className="text-center mb-12">
                      <h3 className="text-4xl font-bold text-gray-900 mb-4">Enterprise-Ready Technology Stack</h3>
                      <p className="text-xl text-gray-600">A modern, scalable, and secure web architecture.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                      <div className="text-center">
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Full-Stack Next.js</h4>
                        <p className="text-gray-600">A performant **React** frontend with a powerful backend built on **serverless functions**, enabling rapid development and scalability.</p>
                      </div>
                      <div className="text-center">
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Secure API & State</h4>
                        <p className="text-gray-600">Backend APIs are secured with **JSON Web Tokens (JWT)**. In-memory rate-limiting is used on API routes to prevent abuse.</p>
                      </div>
                      <div className="text-center">
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Clean & Maintainable Code</h4>
                        <p className="text-gray-600">Showcasing a modular architecture with custom React Hooks, organized utilities, and a focus on code that is easy to understand and extend.</p>
                      </div>
                    </div>
                  </div>
                </div>
            </section>
          </main>

          <footer className="content-footer">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center text-xs text-white gap-4">
                  <p>&copy; 2025 Jared S. Robertson</p>
                  <p className="text-center font-medium text-gray-300">
                    This is a portfolio project and not affiliated with any real entity.
                  </p>
                  <a href="mailto:jared.s.robertson@example.com" className="hover:underline">
                    jared.s.robertson@example.com
                  </a>
                </div>
              </div>
          </footer>
        </div>

        <ChatWidget />

        {showGitHubModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 animate-slide-up">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaGithub className="w-8 h-8 text-white"/>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">View Project on GitHub</h2>
                <p className="text-gray-600 mt-2">The repository contains the complete source code for this demo.</p>
              </div>
              <div className="flex space-x-3">
                <button onClick={() => setShowGitHubModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={() => { window.open('https://github.com/jaredsrobertson/ai-cx-chat', '_blank'); setShowGitHubModal(false); }} className="flex-1 btn-primary">Open GitHub</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}