import { HiCloud, HiSparkles, HiQuestionMarkCircle, HiOutlineUserGroup } from 'react-icons/hi2';

export default function BotSelection({ onSelect, onAgentRequest }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-brand-ui-02 text-center">
      <h2 className="text-xl font-bold text-brand-text-primary mb-2">Choose an Assistant</h2>
      <p className="text-brand-text-secondary mb-8 max-w-sm">
        Select a specialized assistant to get started.
      </p>

      <div className="space-y-4 w-full max-w-sm">
        <button
          onClick={() => onSelect('banking')}
          className="w-full text-left p-4 bg-brand-ui-01 border border-brand-ui-03 rounded-lg hover:border-brand-blue transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-blue/10 text-brand-blue rounded-lg flex items-center justify-center flex-shrink-0">
              <HiCloud className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-brand-text-primary">
                CloudBank Concierge
              </h3>
              <p className="text-sm text-brand-text-secondary mt-1">
                For everyday banking tasks.
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onSelect('advisor')}
          className="w-full text-left p-4 bg-brand-ui-01 border border-brand-ui-03 rounded-lg hover:border-green-500 transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-600/10 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <HiSparkles className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-brand-text-primary">
                AI Advisor
              </h3>
              <p className="text-sm text-brand-text-secondary mt-1">
                For financial advice and planning.
              </p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => onSelect('knowledge')}
          className="w-full text-left p-4 bg-brand-ui-01 border border-brand-ui-03 rounded-lg hover:border-yellow-500 transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/10 text-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <HiQuestionMarkCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-brand-text-primary">
                Knowledge Base
              </h3>
              <p className="text-sm text-brand-text-secondary mt-1">
                For questions about our products and services.
              </p>
            </div>
          </div>
        </button>

        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-brand-ui-03" />
            </div>
            <div className="relative flex justify-center">
                <span className="bg-brand-ui-02 px-2 text-sm text-brand-text-secondary">Or</span>
            </div>
        </div>
        
        <button
          onClick={onAgentRequest}
          className="w-full text-left p-4 bg-brand-ui-01 border border-brand-ui-03 rounded-lg hover:border-brand-blue transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-blue/10 text-brand-blue rounded-lg flex items-center justify-center flex-shrink-0">
              <HiOutlineUserGroup className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-brand-text-primary">
                Chat with a Live Agent
              </h3>
              <p className="text-sm text-brand-text-secondary mt-1">
                For complex issues or personal assistance.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}