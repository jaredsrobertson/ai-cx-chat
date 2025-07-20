import '../styles/globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export default function App({ Component, pageProps }) {
  return (
    <main className={`${inter.variable} font-sans`}>
      <ThemeProvider>
        <AuthProvider>
          <AnalyticsProvider>
            <Component {...pageProps} />
          </AnalyticsProvider>
        </AuthProvider>
      </ThemeProvider>
    </main>
  );
}