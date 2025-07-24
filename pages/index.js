import Head from 'next/head';
import { useTheme } from '@/contexts/ThemeContext';
import { HiCloud, HiOutlineSun, HiOutlineMoon } from 'react-icons/hi2';
import { FaGithub } from 'react-icons/fa';
import dynamic from 'next/dynamic';

const ChatWidget = dynamic(() => import('@/components/chat/ChatWidget'), {
  ssr: false,
});

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path fill-rule="evenodd" d="M4.5 9.75a6 6 0 0 1 11.573-2.226 3.75 3.75 0 0 1 4.133 4.303A4.5 4.5 0 0 1 18 20.25H6.75a5.25 5.25 0 0 1-2.23-10.004 6.072 6.072 0 0 1-.02-.496Z" clip-rule="evenodd"></path></svg>`;
const faviconDataUri = `data:image/svg+xml;base64,${typeof window !== 'undefined' ? window.btoa(faviconSvg) : Buffer.from(faviconSvg).toString('base64')}`;

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <Head>
        <title>AI-Powered CX Chat Demo</title>
        <meta name="description" content="A technical demonstration of an end-to-end conversational AI solution, combining Dialogflow-style fulfillment with generative AI." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href={faviconDataUri} />
      </Head>

      <div className="min-h-screen">
        <div className="header-container">
          <header className="h-full flex items-center">
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white dark:bg-dark-brand-ui-01 rounded-lg flex items-center justify-center shadow-md">
                    <HiCloud className="w-6 h-6 text-brand-blue dark:text-dark-brand-blue" />
                  </div>
                  <h1 className="text-2xl font-bold text-white">CloudBank</h1>
                </div>
                <nav className="hidden md:flex items-center space-x-4">
                  <a href="#ai-architecture" className="text-gray-200 hover:text-white font-medium">AI Architecture</a>
                  <a href="#tech-stack" className="text-gray-200 hover:text-white font-medium">Tech Stack</a>
                  <button className="btn-primary" data-chat-toggle="true">Launch Demo</button>
                  <button 
                    onClick={toggleTheme} 
                    className="p-2.5 rounded-md hover:bg-white/20 text-white transition-colors" 
                    title="Toggle Theme"
                    aria-label="Toggle Theme"
                  >
                    {theme === 'light' ? <HiOutlineMoon className="w-6 h-6" /> : <HiOutlineSun className="w-6 h-6" />}
                  </button>
                </nav>
              </div>
            </div>
          </header>
        </div>

        <div className="content-container">
          <main>
            <section id="demo" className="scroll-section">
              <div className="text-center">
                <h2 className="text-6xl font-bold mb-6 leading-tight text-white">
                    End-to-End AI Customer Service
                    <span className="block">A Technical Demonstration</span>
                </h2>
                <p className="text-xl mb-8 text-blue-100 dark:text-dark-brand-text-secondary leading-relaxed max-w-3xl mx-auto">
                  This project demonstrates a complete conversational AI solution, integrating structured <strong>fulfillment</strong> with generative AI to deliver a seamless customer experience.
                </p>
                <div className="flex justify-center gap-4">
                  <button className="btn-primary" data-chat-toggle="true">Launch Demo</button>
                  <button onClick={() => window.open('https://github.com/jaredsrobertson/ai-cx-chat', '_blank')} className="bg-white/10 text-white font-medium px-6 py-2.5 rounded-lg border border-white/20 hover:bg-white/20 flex items-center justify-center gap-2">
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
                      <h3 className="text-4xl font-bold text-brand-text-primary dark:text-dark-brand-text-primary mb-4">Hybrid AI Solution Architecture</h3>
                      <p className="text-xl text-brand-text-secondary dark:text-dark-brand-text-secondary">Combining NLU-driven fulfillment with generative AI for a comprehensive and robust user experience.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                       <div className="text-center">
                        <h4 className="text-xl font-bold text-brand-text-primary dark:text-dark-brand-text-primary mb-2">Task-Oriented Fulfillment</h4>
                        <p className="text-brand-text-secondary dark:text-dark-brand-text-secondary">Using <strong>Google Dialogflow</strong> for robust intent classification, entity extraction, and stateful dialogue management to handle specific banking tasks.</p>
                      </div>
                      <div className="text-center">
                        <h4 className="text-xl font-bold text-brand-text-primary dark:text-dark-brand-text-primary mb-2">Generative Conversation</h4>
                        <p className="text-brand-text-secondary dark:text-dark-brand-text-secondary">Leveraging <strong>OpenAI's GPT models</strong> to provide open-ended, human-like financial advice that goes beyond pre-defined conversational flows.</p>
                      </div>
                      <div className="text-center">
                        <h4 className="text-xl font-bold text-brand-text-primary dark:text-dark-brand-text-primary mb-2">Voice-First Integration</h4>
                        <p className="text-brand-text-secondary dark:text-dark-brand-text-secondary">Integrating browser-native <strong>Speech Recognition (ASR)</strong> and dynamic <strong>Text-to-Speech (TTS)</strong> to create a complete, voice-enabled experience.</p>
                      </div>
                    </div>
                  </div>
                </div>
            </section>

            <section id="tech-stack" className="scroll-section">
                <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="card">
                    <div className="text-center mb-12">
                      <h3 className="text-4xl font-bold text-brand-text-primary dark:text-dark-brand-text-primary mb-4">Enterprise-Ready Technology Stack</h3>
                      <p className="text-xl text-brand-text-secondary dark:text-dark-brand-text-secondary">A modern, scalable, and secure web architecture built for performance and maintainability.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                       <div className="text-center">
                        <h4 className="text-xl font-bold text-brand-text-primary dark:text-dark-brand-text-primary mb-2">Full-Stack Next.js</h4>
                        <p className="text-brand-text-secondary dark:text-dark-brand-text-secondary">A performant <strong>React</strong> frontend with a powerful backend built on <strong>serverless functions</strong>, enabling rapid, agile development and scalability.</p>
                      </div>
                      <div className="text-center">
                        <h4 className="text-xl font-bold text-brand-text-primary dark:text-dark-brand-text-primary mb-2">Secure API & State</h4>
                        <p className="text-brand-text-secondary dark:text-dark-brand-text-secondary">Backend APIs are secured with <strong>JSON Web Tokens (JWT)</strong>. In-memory rate-limiting on API routes provides operational diagnostic capabilities to prevent abuse.</p>
                      </div>
                      <div className="text-center">
                        <h4 className="text-xl font-bold text-brand-text-primary dark:text-dark-brand-text-primary mb-2">Clean & Maintainable Code</h4>
                        <p className="text-brand-text-secondary dark:text-dark-brand-text-secondary">A modular architecture with custom React Hooks, organized utilities, and comprehensive logging for a codebase that is easy to understand and extend.</p>
                      </div>
                    </div>
                  </div>
                </div>
            </section>
            
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
          </main>
        </div>

        <ChatWidget />
      </div>
    </>
  );
}