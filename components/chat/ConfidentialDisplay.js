import { HiOutlineLockClosed } from 'react-icons/hi2';
import { formatCurrency } from '@/lib/utils';

export default function ConfidentialDisplay({ data }) {
  if (!data) return null;

  const renderContent = () => {
    switch (data.type) {
      case 'balances':
        return (
          <ul className="space-y-2">
            {data.accounts.map(acc => (
              <li key={acc.name} className="flex justify-between items-center text-sm">
                <span className="text-brand-text-secondary dark:text-dark-brand-text-secondary">{acc.name} Account</span>
                <span className="font-medium text-brand-text-primary dark:text-dark-brand-text-primary">{formatCurrency(acc.balance)}</span>
              </li>
            ))}
          </ul>
        );
      case 'transaction_history':
        return (
            <ul className="space-y-2">
                {data.transactions.map((tx, index) => (
                    <li key={index} className="flex justify-between items-center text-sm">
                        <div>
                            <p className="font-medium text-brand-text-primary dark:text-dark-brand-text-primary">{tx.description}</p>
                            <p className="text-xs text-brand-text-secondary dark:text-dark-brand-text-secondary">{tx.date}</p>
                        </div>
                        <span className={`font-medium ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(tx.amount)}
                        </span>
                    </li>
                ))}
            </ul>
        );
      case 'transfer_confirmation':
        const { details } = data;
        return (
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between items-center">
              <span className="text-brand-text-secondary dark:text-dark-brand-text-secondary">Amount</span>
              <span className="font-medium text-red-600">{formatCurrency(details.amount)}</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-brand-text-secondary dark:text-dark-brand-text-secondary">From</span>
              <span className="font-medium text-brand-text-primary dark:text-dark-brand-text-primary capitalize">{details.fromAccount}</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-brand-text-secondary dark:text-dark-brand-text-secondary">To</span>
              <span className="font-medium text-brand-text-primary dark:text-dark-brand-text-primary capitalize">{details.toAccount}</span>
            </li>
          </ul>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-dark-brand-ui-01/50 border border-brand-ui-03 dark:border-dark-brand-ui-03 p-3 rounded-lg">
      <div className="flex items-center gap-2 text-xs text-brand-text-secondary dark:text-dark-brand-text-secondary mb-3">
        <HiOutlineLockClosed className="w-4 h-4" />
        <span>Secure Information</span>
      </div>
      {renderContent()}
    </div>
  );
}