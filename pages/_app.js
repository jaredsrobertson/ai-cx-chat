import '../styles/globals.css';
import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

// This component will run once on app load to verify the auth token
function AppInitializer() {
  const verifyToken = useAppStore(state => state.verifyToken);
  useEffect(() => {
    verifyToken();
  }, [verifyToken]);
  return null;
}

export default function App({ Component, pageProps }) {
  return (
    <main className={`${inter.variable} font-sans`}>
      <AppInitializer />
      <Component {...pageProps} />
    </main>
  );
}