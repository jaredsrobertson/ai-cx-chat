// Banking intents and training phrases for Dialogflow
export const bankingIntents = [
  {
    displayName: 'account.balance',
    trainingPhrases: [
      'What is my balance',
      'Check my account balance',
      'How much money do I have',
      'Show me my balance',
      'Account balance please',
      'What\'s in my checking account',
      'What\'s in my savings account',
      'How much is in my account',
      'Check balance',
      'Balance inquiry',
      'Show my account balances',
      'What are my balances'
    ],
    parameters: [
      {
        displayName: 'accountType',
        entityType: '@accountType',
        isList: false,
        mandatory: false
      }
    ],
    responses: [
      'I\'ll check your account balance for you.',
      'Let me look up your current balance.',
      'I can help you with your account balance.'
    ]
  },
  {
    displayName: 'account.transfer',
    trainingPhrases: [
      'Transfer money',
      'Move money between accounts',
      'Transfer $500 to savings',
      'I want to transfer funds',
      'Move $100 from checking to savings',
      'Transfer money to my savings',
      'Can I transfer money',
      'How do I transfer money',
      'Move funds',
      'Transfer between accounts'
    ],
    parameters: [
      {
        displayName: 'amount',
        entityType: '@sys.unit-currency',
        isList: false,
        mandatory: false
      },
      {
        displayName: 'fromAccount',
        entityType: '@accountType',
        isList: false,
        mandatory: false
      },
      {
        displayName: 'toAccount',
        entityType: '@accountType',
        isList: false,
        mandatory: false
      }
    ],
    responses: [
      'I can help you transfer funds between your accounts.',
      'I\'ll assist you with your transfer request.',
      'Let me help you move money between accounts.'
    ]
  },
  {
    displayName: 'account.history',
    trainingPhrases: [
      'Show my transaction history',
      'Recent transactions',
      'What are my recent transactions',
      'Show me my spending',
      'Transaction history',
      'Recent activity',
      'What did I spend money on',
      'Show my purchases',
      'Account activity',
      'Recent account activity'
    ],
    parameters: [
      {
        displayName: 'accountType',
        entityType: '@accountType',
        isList: false,
        mandatory: false
      }
    ],
    responses: [
      'I\'ll show you your recent transaction history.',
      'Let me pull up your recent account activity.',
      'Here\'s your recent transaction history.'
    ]
  },
  {
    displayName: 'account.payment',
    trainingPhrases: [
      'Make a payment',
      'Pay a bill',
      'I want to pay someone',
      'Send money',
      'Pay $200 to utilities',
      'Make a bill payment',
      'How do I pay bills',
      'Schedule a payment',
      'Pay my credit card',
      'Send payment'
    ],
    parameters: [
      {
        displayName: 'amount',
        entityType: '@sys.unit-currency',
        isList: false,
        mandatory: false
      },
      {
        displayName: 'payee',
        entityType: '@sys.any',
        isList: false,
        mandatory: false
      }
    ],
    responses: [
      'I can help you make a payment.',
      'I\'ll assist you with your bill payment.',
      'Let me help you set up a payment.'
    ]
  },
  {
    displayName: 'branch.hours',
    trainingPhrases: [
      'What are your hours',
      'When are you open',
      'Branch hours',
      'What time do you close',
      'Are you open today',
      'Bank hours',
      'When do you open',
      'What are your business hours',
      'Hours of operation',
      'When can I visit the branch'
    ],
    parameters: [
      {
        displayName: 'location',
        entityType: '@sys.location',
        isList: false,
        mandatory: false
      }
    ],
    responses: [
      'Our branches are typically open Monday through Friday.',
      'I can tell you our branch hours.',
      'Here are our current operating hours.'
    ]
  },
  {
    displayName: 'account.help',
    trainingPhrases: [
      'Help me',
      'What can you do',
      'How can you help',
      'I need help',
      'What services do you offer',
      'Help with banking',
      'What can I ask you',
      'Banking help',
      'I need assistance',
      'Can you help me'
    ],
    responses: [
      'I\'m here to help with all your banking needs!',
      'I can assist you with various banking services.',
      'Let me help you with your banking questions.'
    ]
  }
];

// Entity definitions for Dialogflow
export const bankingEntities = [
  {
    displayName: 'accountType',
    entries: [
      {
        value: 'checking',
        synonyms: ['checking', 'checking account', 'chequing', 'primary account']
      },
      {
        value: 'savings',
        synonyms: ['savings', 'savings account', 'save', 'saving']
      },
      {
        value: 'credit',
        synonyms: ['credit card', 'credit', 'card', 'cc']
      },
      {
        value: 'all',
        synonyms: ['all', 'both', 'everything', 'all accounts']
      }
    ]
  }
];

// Webhook fulfillment responses
export const webhookResponses = {
  'account.balance': {
    requiresAuth: true,
    authMessage: "I'd be happy to check your account balance! For security purposes, please log in to access your account information."
  },
  'account.transfer': {
    requiresAuth: true,
    authMessage: "I can help you transfer funds between your accounts! Please log in first to access this service."
  },
  'account.history': {
    requiresAuth: true,
    authMessage: "I can show you your recent transactions! Please log in to view your account history."
  },
  'account.payment': {
    requiresAuth: true,
    authMessage: "I can help you make payments! Please log in to access your payment options."
  },
  'branch.hours': {
    requiresAuth: false,
    response: "Our branches are open Monday-Friday 9:00 AM - 5:00 PM, Saturday 9:00 AM - 2:00 PM. We're closed on Sundays and major holidays."
  },
  'account.help': {
    requiresAuth: false,
    response: "I'm here to help with your banking needs! I can assist you with account balances, transfers, payments, branch hours, and general banking questions. What would you like help with today?"
  }
};
      '