// lib/chat-constants.ts

export const STANDARD_QUICK_REPLIES = [
  { display: 'Hours', payload: 'What are your hours?' },
  { display: 'Locations', payload: 'Where are you located?' },
  { display: 'Routing Number', payload: 'What is my routing number?' },
  { display: 'Contact Us', payload: 'How can I reach customer service?' },
  { display: 'Check Balance', payload: 'Check my balance' },
  { display: 'Transfer Funds', payload: 'Transfer funds' },
  { display: 'Transaction History', payload: 'Show my transaction history' },
  { display: 'Chat with Agent', payload: 'Chat with agent' }
];

// Automatically generate the map from the array above
// This ensures the translation layer is always in sync with the list
export const QUICK_REPLY_MAP = STANDARD_QUICK_REPLIES.reduce((acc, item) => {
  acc[item.display] = item;
  return acc;
}, {} as Record<string, typeof STANDARD_QUICK_REPLIES[0]>);