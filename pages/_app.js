import '../styles/globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { Inter } from 'next/font/google';

// Initialize the font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // A CSS variable to be used in Tailwind
});

export default function App({ Component, pageProps }) {
  return (
    // Apply the font variable to the root of your app
    <main className={`${inter.variable} font-sans`}>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </main>
  );
}