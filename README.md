# Intelligent AI Customer Experience Platform

This project is a demonstration of a modern, enterprise-grade AI customer experience solution. It features an **Intelligent Orchestrator** that dynamically routes user requests between transactional banking bots, support assistants, and a knowledge base.

Built with **Next.js 14**, this application demonstrates a "Lead Engineer" level architecture, focusing on security, scalability, and automated reliability.

## Key Features

### 1. Intelligent Intent Orchestrator
Instead of forcing users to manually select a bot, this application uses a server-side **Orchestrator** pattern.
* **Automatic Routing:** Analyzes user input to determine if the intent is "Banking" (Transactional), "Support" (FAQ), or "General".
* **Unified Interface:** A single chat window handles all request types seamlessly.

### 2. Retrieval-Augmented Generation (RAG)
For unstructured questions that standard chatbots fail to answer, the system utilizes **AWS Kendra**.
* **Semantic Search:** Queries an indexed knowledge base (documents/FAQs) when specific intents are not matched.
* **Citations:** Responses include "Source" chips, allowing users to verify the information against the original documents.

### 3. Secure Banking Operations
The application mocks a secure banking core using **NextAuth.js** for industry-standard session management.
* **Protected Routes:** Sensitive actions (like "Transfer Funds") trigger a secure login flow if the user is unauthenticated.
* **Context Preservation:** Authentication state is maintained across the conversation, allowing the bot to perform actions on the user's behalf without repeated logins.

### 4. Production-Grade Reliability
Reliability is enforced through a robust **CI/CD pipeline**.
* **E2E Testing:** **Playwright** tests simulate real user journeys (Login -> Chat -> Transaction) before every deployment.
* **State Management:** **Zustand** provides predictable, testable state management for the chat interface, replacing brittle `useEffect` chains.

## Technical Stack

**Frontend:**
* **Next.js 14** (App Router & Server Actions)
* **React 19**
* **TypeScript**
* **Tailwind CSS**
* **Zustand** (State Management)

**Backend & AI:**
* **NextAuth.js** (Authentication)
* **Google Dialogflow** (Transactional Banking Intents)
* **Amazon Lex V2** (General Support Intents)
* **AWS Kendra** (RAG/Knowledge Base)
* **AWS SDK**

**DevOps & Quality:**
* **Playwright** (End-to-End Testing)
* **GitHub Actions** (CI/CD)

---

*This project demonstrates a practical application of building a scalable, secure, and interactive AI-powered chat solution.*
