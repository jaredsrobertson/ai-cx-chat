AI-Powered Customer Experience Demo
This project is a demonstration of a modern, AI-powered customer experience solution, showcasing a conversational chat application that integrates with multiple leading AI platforms and a custom backend. Built with Next.js, this application is designed to handle real-world scenarios like API integration, dynamic response generation, and user authentication.
This project highlights my ability to:
 * Integrate third-party services (Google Dialogflow, Amazon Lex) into a full-stack application.
 * Build and secure a custom REST API to handle business logic.
 * Develop a responsive, real-time user interface with modern web technologies.
 * Manage application state and context to create a seamless user experience.
Key Features
1. Dual AI Assistant Integration
The application features a user-selectable chat interface that can connect to two different AI platforms:
 * Google Dialogflow: Functions as a sophisticated banking assistant capable of handling tasks that require data persistence and fulfillment, such as checking account balances, transferring funds, and viewing transaction history.
 * Amazon Lex: Acts as a FAQ and customer support bot, designed to answer common questions from a knowledge base about topics like account support and security.
2. Webhook Fulfillment & Custom API
To provide dynamic and secure responses, the Dialogflow assistant uses webhook fulfillment to communicate with a custom-built banking API.
 * Custom Banking API: Built with Next.js API Routes, this mock API exposes endpoints for fetching account data, transactions, and processing transfers. It uses token-based authentication to protect user data.
 * Authenticated Requests: For actions like checking a balance or making a transfer, the bot first requires the user to authenticate. Once authenticated, a context is set in Dialogflow, allowing the webhook to make secure calls to the banking API on the user's behalf.
3. Responsive Real-Time Chat Interface
The chat widget is built with React and Tailwind CSS and is designed to be fully responsive.
 * Mobile-First Design: The widget is full-screen on mobile devices to ensure a native-app-like experience and is optimized to handle mobile browser viewport changes.
 * Dynamic UI: The interface displays bot responses, quick replies, and messages that require user interaction (like the login modal) in real-time.
Technical Stack
The project utilizes a modern, TypeScript-based stack:
 * Frontend:
   * Next.js 14 (App Router)
   * React 19
   * TypeScript
   * Tailwind CSS
 * Backend & Services:
   * Next.js API Routes (Vercel Edge Functions)
   * Google Dialogflow
   * Amazon Lex V2
   * AWS SDK
This project demonstrates a practical application of building a scalable and interactive AI-powered chat solution. Thank you for your consideration.
