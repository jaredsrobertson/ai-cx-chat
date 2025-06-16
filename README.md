# AI-Powered Customer Experience Chatbot

This is a portfolio project demonstrating a modern, AI-powered web chatbot for the financial services industry, built to showcase skills relevant for a role at Genesys.

## Live Demo

[Link to your live Vercel/Netlify deployment]

## Features

- **Dual-Bot System**: 
  - **SecureBank Assistant**: A task-oriented bot using **Google Dialogflow** for NLU, handling banking queries like balance checks, fund transfers, and transaction history.
  - **Financial Advisor**: A conversational bot powered by the **OpenAI GPT API** for generative, open-ended financial advice.
- **Advanced Conversational AI**:
  - **Speech-to-Text**: Real-time voice recognition using the Web Speech API.
  - **Text-to-Speech**: Bot responses can be read aloud.
  - **Mock Live Agent Handoff**: Demonstrates the ability to escalate a conversation to a human agent.
- **Modern Web Technologies**:
  - Built with **Next.js** and **React**.
  - Styled with **Tailwind CSS** for a responsive, modern design.
  - Secure, mock authentication using **JSON Web Tokens (JWT)**.
- **Clean Architecture**:
  - Streamlined frontend logic with React Hooks.
  - Modular backend with serverless functions for interacting with AI services.

## Running the Project Locally

1.  **Clone the repository:**
    ```bash
    git clone [your-repo-url]
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    - Create a `.env.local` file in the project root.
    - Copy the contents from `.env.example` and fill in your secret keys and project ID.
    - You will also need a `service-account.json` file from Google Cloud for Dialogflow authentication.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view it in the browser.