import dynamic from 'next/dynamic';

// Update the dynamic imports to use CloudIcon
const CloudIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => mod.CloudIcon), { ssr: false });
const SparklesIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => mod.SparklesIcon), { ssr: false });

export default function BotSelection({ onSelect }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose an Assistant</h2>
      <p className="text-gray-600 mb-8 max-w-sm">
        Select a specialized assistant to get started. Each is tailored for different tasks.
      </p>
      <div className="space-y-4 w-full max-w-sm">
        <button
          onClick={() => onSelect('banking')}
          className="w-full text-left p-6 bg-white border border-gray-200 rounded-lg hover:border-banking-blue hover:bg-blue-50 transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-banking-blue text-white rounded-lg flex items-center justify-center flex-shrink-0">
              {/* Replace the old icon with the CloudIcon */}
              <CloudIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-banking-navy group-hover:text-banking-blue">CloudBank Concierge</h3>
              <p className="text-sm text-gray-600 mt-1">
                For everyday banking tasks. Powered by Google Dialogflow for structured queries.
              </p>
            </div>
          </div>
        </button>
        <button
          onClick={() => onSelect('advisor')}
          className="w-full text-left p-6 bg-white border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-600 text-white rounded-lg flex items-center justify-center flex-shrink-0">
              <SparklesIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-green-800 group-hover:text-green-600">AI Advisor</h3>
              <p className="text-sm text-gray-600 mt-1">
                For financial advice and planning. Powered by OpenAI GPT-4 for generative insights.
              </p>
            </div>
          </div>
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-8">
        You can switch assistants at any time using the tabs at the top of the chat window.
      </p>
    </div>
  );
}