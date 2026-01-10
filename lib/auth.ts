import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Validate required environment variables on startup
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    'NEXTAUTH_SECRET is required. Generate one using: openssl rand -base64 32'
  );
}

if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === 'production') {
  throw new Error('NEXTAUTH_URL is required in production');
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Demo Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "demo@bank.com" },
        password: { label: "Password", type: "password", placeholder: "demo123" }
      },
      async authorize(credentials) {
        // In a real app, you would validate against a database
        // This is a demo with hardcoded credentials
        if (
          credentials?.email === "demo@bank.com" &&
          credentials?.password === "demo123"
        ) {
          return { 
            id: "user-1", 
            name: "John Demo", 
            email: "demo@bank.com" 
          };
        }
        
        // Return null if authentication fails
        return null;
      }
    })
  ],
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  pages: {
    signIn: '/auth/signin',
  },
  
  secret: process.env.NEXTAUTH_SECRET,
  
  callbacks: {
    async jwt({ token, user }) {
      // Add user ID to token on sign in
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    
    async session({ session, token }) {
      // Add user ID to session
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  
  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',
};