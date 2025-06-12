import Head from 'next/head';
import { useState } from 'react';
import ChatWidget from '../components/chat/ChatWidget';
import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const { user } = useAuth();
  const [showGitHubModal, setShowGitHubModal] = useState(false);

  const openChatWidget = () => {
    // Find and click the chat widget button
    const chatButton = document.querySelector('button[data-chat-toggle="true"]');
    if (chatButton) {
      chatButton.click();
    }
  };

  return (
    <>
      <Head>
        <title>SecureBank - Your Trusted Financial Partner</title>
        <meta name="description" content="Modern banking with AI-powered assistance" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-banking-blue rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-banking-navy">SecureBank</h1>
                <p className="text-sm text-gray-600">AI-Powered Banking</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-banking-blue font-medium">AI Features</a>
              <a href="#tech" className="text-gray-700 hover:text-banking-blue font-medium">Technology</a>
              <a href="#demo" className="text-gray-700 hover:text-banking-blue font-medium">Live Demo</a>
              <button 
                onClick={openChatWidget}
                className="btn-primary"
              >
                {user ? `Welcome, ${user.name.split(' ')[0]}` : 'Try AI Assistant'}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-banking-navy via-banking-blue to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-5xl font-bold mb-6 leading-tight">
                AI-Powered Banking
                <span className="text-blue-200"> Assistant Demo</span>
              </h2>
              <p className="text-xl mb-8 text-blue-100 leading-relaxed">
                Experience next-generation conversational AI for banking. This demo showcases Dialogflow integration, 
                OpenAI GPT-4 responses, voice recognition, and secure authentication—built with modern web technologies.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={openChatWidget}
                  className="btn-primary bg-white text-banking-blue hover:bg-gray-50"
                >
                  🤖 Try Live Demo
                </button>
                <button 
                  onClick={() => setShowGitHubModal(true)}
                  className="btn-secondary border-blue-200 text-blue-100 hover:bg-blue-700"
                >
                  View Source Code
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 border border-white border-opacity-20">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <span className="font-semibold">AI Banking Assistant</span>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="bg-white bg-opacity-10 rounded-lg p-3">
                    <p>"What's my account balance?"</p>
                  </div>
                  <div className="bg-blue-500 bg-opacity-30 rounded-lg p-3 ml-8">
                    <p>Your checking balance is $2,847.52</p>
                  </div>
                  <div className="bg-white bg-opacity-10 rounded-lg p-3">
                    <p>"Help me create a budget"</p>
                  </div>
                  <div className="bg-blue-500 bg-opacity-30 rounded-lg p-3 ml-8">
                    <p>I'd recommend the 50/30/20 rule...</p>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <button 
                    onClick={openChatWidget}
                    className="bg-white text-banking-blue px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg animate-pulse"
                  >
                    🚀 Try Now - Click Here!
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section id="tech" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Built with Modern AI Technology
            </h3>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              This demo showcases enterprise-grade conversational AI architecture using industry-leading tools and frameworks.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">Google Dialogflow</h4>
              <p className="text-gray-600 leading-relaxed">
                Intent recognition, entity extraction, and conversation management for structured banking queries.
              </p>
            </div>

            <div className="card text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">OpenAI GPT-4</h4>
              <p className="text-gray-600 leading-relaxed">
                Advanced natural language processing for financial advisory responses and complex query handling.
              </p>
            </div>

            <div className="card text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">Web Speech API</h4>
              <p className="text-gray-600 leading-relaxed">
                Browser-native speech recognition and synthesis for hands-free voice interactions.
              </p>
            </div>

            <div className="card text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">JWT Authentication</h4>
              <p className="text-gray-600 leading-relaxed">
                Secure session management with JSON Web Tokens for account access and personalization.
              </p>
            </div>

            <div className="card text-center">
              <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">Next.js & React</h4>
              <p className="text-gray-600 leading-relaxed">
                Modern React framework with serverless API routes and optimized performance.
              </p>
            </div>

            <div className="card text-center">
              <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3H5a2 2 0 00-2 2v12a4 4 0 004 4h2a2 2 0 002-2V5a2 2 0 00-2-2z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">Responsive Design</h4>
              <p className="text-gray-600 leading-relaxed">
                Mobile-first design with Tailwind CSS for seamless experience across all devices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              AI Assistant Capabilities
            </h3>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Dual-mode conversational AI that demonstrates both structured banking operations 
              and intelligent financial advisory through advanced NLP integration.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="w-16 h-16 bg-banking-blue rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">Banking Assistant</h4>
              <p className="text-gray-600 leading-relaxed">
                Dialogflow-powered intent recognition handles account balances, transfers, payments, 
                and transaction history with secure authentication workflows.
              </p>
            </div>

            <div className="card text-center">
              <div className="w-16 h-16 bg-banking-blue rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">Voice Integration</h4>
              <p className="text-gray-600 leading-relaxed">
                Hands-free interaction using Web Speech API with real-time voice recognition 
                and text-to-speech responses for accessibility.
              </p>
            </div>

            <div className="card text-center">
              <div className="w-16 h-16 bg-banking-blue rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">GPT-4 Financial Advisor</h4>
              <p className="text-gray-600 leading-relaxed">
                Advanced AI provides personalized budgeting tips, investment guidance, and financial 
                planning advice through OpenAI's most capable language model.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Live Interactive Demo
            </h3>
            <p className="text-xl text-gray-600">
              Experience the AI assistant in action - try both banking and financial advisory modes
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-bold text-banking-blue mb-3">🏦 Banking Assistant</h4>
                  <div className="space-y-3 text-sm">
                    <div className="bg-white rounded-lg p-3 border-l-4 border-banking-blue">
                      <p className="font-medium">Try asking:</p>
                      <p className="text-gray-600">"What's my account balance?"</p>
                      <p className="text-gray-600">"Transfer $500 to savings"</p>
                      <p className="text-gray-600">"Show my recent transactions"</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-bold text-green-600 mb-3">💡 Financial Advisor</h4>
                  <div className="space-y-3 text-sm">
                    <div className="bg-white rounded-lg p-3 border-l-4 border-green-500">
                      <p className="font-medium">Try asking:</p>
                      <p className="text-gray-600">"Help me create a budget"</p>
                      <p className="text-gray-600">"Investment advice for beginners"</p>
                      <p className="text-gray-600">"How to build an emergency fund"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-br from-banking-navy to-banking-blue rounded-2xl p-8 text-white">
                <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h4 className="text-2xl font-bold mb-4">Ready to Experience AI Banking?</h4>
                <p className="mb-6 text-blue-100">
                  Click the enlarged chat icon below to start your conversation with our AI assistant
                </p>
                <button 
                  onClick={openChatWidget}
                  className="bg-white text-banking-blue px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-50 transition-colors shadow-lg"
                >
                  🚀 Launch AI Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Complete Banking Services
            </h3>
            <p className="text-xl text-gray-600">
              Everything you need to manage your finances in one place
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "💳", title: "Digital Accounts", desc: "Checking & Savings with competitive rates" },
              { icon: "🏠", title: "Home Loans", desc: "Mortgages with AI-assisted pre-approval" },
              { icon: "🚗", title: "Auto Financing", desc: "Quick approvals for new and used vehicles" },
              { icon: "📈", title: "Investment Services", desc: "Grow your wealth with expert guidance" },
              { icon: "💼", title: "Business Banking", desc: "Solutions for small and large businesses" },
              { icon: "🎓", title: "Student Loans", desc: "Education financing with flexible terms" },
              { icon: "💰", title: "Personal Loans", desc: "Fast funding for your personal needs" },
              { icon: "🛡️", title: "Insurance", desc: "Protect what matters most to you" }
            ].map((service, index) => (
              <div key={index} className="bg-white rounded-lg p-6 text-center hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-4">{service.icon}</div>
                <h4 className="font-bold text-gray-900 mb-2">{service.title}</h4>
                <p className="text-sm text-gray-600">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-banking-navy text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-banking-blue rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <span className="text-xl font-bold">SecureBank</span>
              </div>
              <p className="text-blue-200 mb-4">
                Empowering your financial future with intelligent banking solutions.
              </p>
            </div>
            
            <div>
              <h5 className="font-bold mb-4">Banking</h5>
              <ul className="space-y-2 text-blue-200">
                <li><a href="#" className="hover:text-white">Checking</a></li>
                <li><a href="#" className="hover:text-white">Savings</a></li>
                <li><a href="#" className="hover:text-white">Credit Cards</a></li>
                <li><a href="#" className="hover:text-white">Loans</a></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-bold mb-4">Support</h5>
              <ul className="space-y-2 text-blue-200">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-bold mb-4">Connect</h5>
              <ul className="space-y-2 text-blue-200">
                <li><a href="#" className="hover:text-white">Mobile App</a></li>
                <li><a href="#" className="hover:text-white">Online Banking</a></li>
                <li><a href="#" className="hover:text-white">Find ATMs</a></li>
                <li><a href="#" className="hover:text-white">Branch Locator</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-blue-800 mt-8 pt-8 text-center text-blue-200">
            <p>&copy; 2024 SecureBank. All rights reserved. Member FDIC.</p>
          </div>
        </div>
      </footer>

      {/* Chat Widget */}
      <ChatWidget />

      {/* GitHub Modal */}
      {showGitHubModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">View Source Code</h2>
              <p className="text-gray-600 mt-2">Would you like to view this project on GitHub?</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-lg mb-6">
              <p className="font-medium mb-1">Repository includes:</p>
              <ul className="text-sm space-y-1">
                <li>• Complete Next.js application code</li>
                <li>• Dialogflow integration setup</li>
                <li>• OpenAI GPT-4 implementation</li>
                <li>• Authentication & voice features</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowGitHubModal(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  window.open('https://github.com/jaredsrobertson/ai-cx-chat', '_blank');
                  setShowGitHubModal(false);
                }}
                className="flex-1 btn-primary"
              >
                Open GitHub
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}