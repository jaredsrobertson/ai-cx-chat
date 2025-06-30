import { CloudIcon, SparklesIcon } from '@/components/ui/Icons';

export default function BotSelection({ onSelect }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-100 text-center">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Choose an Assistant</h2>
      <p className="text-gray-600 mb-8 max-w-sm">
        Select a specialized assistant to get started.
      </p>
      
      <div className="space-y-4 w-full max-w-sm">
        <button
          onClick={() => onSelect('banking')}
          className="w-full text-left p-4 bg-white border border-gray-300 rounded-xl hover:border-brand-blue hover:shadow-md transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-blue text-white rounded-lg flex items-center justify-center flex-shrink-0">
              <CloudIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-brand-blue">
                CloudBank Concierge
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                For everyday banking tasks.
              </p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => onSelect('advisor')}
          className="w-full text-left p-4 bg-white border border-gray-300 rounded-xl hover:border-green-500 hover:shadow-md transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-600 text-white rounded-lg flex items-center justify-center flex-shrink-0">
              <SparklesIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-green-700">
                AI Advisor
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                For financial advice and planning.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}