import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Demo Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "demo@bank.com" },
        password: { label: "Password", type: "password", placeholder: "demo123" }
      },
      async authorize(credentials) {
        // In a real app, you would fetch from a database here.
        // For this portfolio demo, we validate against hardcoded values.
        if (
          credentials?.email === "demo@bank.com" &&
          credentials?.password === "demo123"
        ) {
          return { id: "user-1", name: "John Demo", email: "demo@bank.com" };
        }
        return null;
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/auth/signin', // We won't use this, but good practice to define
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret-key-change-me",
};