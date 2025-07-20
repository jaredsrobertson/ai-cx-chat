import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

const AnalyticsContext = createContext();

export const AnalyticsProvider = ({ children }) => {
  const [analytics, setAnalytics] = useState([]);
  const [latest, setLatest] = useState({ intent: 'N/A', sentiment: 'N/A' });

  const addAnalyticsEntry = useCallback((entry) => {
    const newEntry = { ...entry, id: uuidv4(), timestamp: new Date() };
    setAnalytics(prev => [newEntry, ...prev].slice(0, 10));
    if (entry.intent && entry.sentiment) {
      setLatest({ intent: entry.intent, sentiment: entry.sentiment });
    }
  }, []);

  const value = useMemo(() => ({
    analytics,
    latest,
    addAnalyticsEntry,
  }), [analytics, latest, addAnalyticsEntry]);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};