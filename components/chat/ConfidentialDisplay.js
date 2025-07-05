import { HiOutlineLockClosed } from 'react-icons/hi2';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export default function ConfidentialDisplay({ data }) {
  if (!data) return null;

  const renderContent = () => {
    switch (data.type) {
      case 'balances':
        return (
          <ul className="space-y-2">
            {data.accounts.map(acc => (
              <li key={acc.name} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{acc.name} Account</span>
                <span className="font-medium text-gray-800">{formatCurrency(acc.balance)}</span>
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
                            <p className="font-medium text-gray-800">{tx.description}</p>
                            <p className="text-xs text-gray-500">{tx.date}</p>
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
              <span className="text-gray-600">Amount</span>
              <span className="font-medium text-red-600">{formatCurrency(details.amount)}</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-gray-600">From</span>
              <span className="font-medium text-gray-800 capitalize">{details.fromAccount}</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-gray-600">To</span>
              <span className="font-medium text-gray-800 capitalize">{details.toAccount}</span>
            </li>
          </ul>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mt-2 border-t border-gray-200 pt-3">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
        <HiOutlineLockClosed className="w-4 h-4" />
        <span>Secure</span>
      </div>
      {renderContent()}
    </div>
  );
}