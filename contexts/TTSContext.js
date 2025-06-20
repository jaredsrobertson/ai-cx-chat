import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const TTSContext = createContext();

export const TTSProvider = ({ children }) => {
  const [nowPlayingId, setNowPlayingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAutoResponseEnabled, setIsAutoResponseEnabled] = useState(false); // State is now managed here
  const audioRef = useRef(null);
  const audioCache = useRef(new Map());

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setNowPlayingId(null);
    setIsLoading(false);
    // Do not clear the error on stop, so it can be seen
  }, []);

  const play = useCallback(async (text, messageId) => {
    if (nowPlayingId === messageId) return;
    stop();
    setError(null);
    setIsLoading(true);
    setNowPlayingId(messageId);

    try {
      const cacheKey = text.substring(0, 100);
      let audioUrl = audioCache.current.get(cacheKey);

      if (!audioUrl) {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `TTS request failed: ${response.status}`);
        }

        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        
        if (audioCache.current.size >= 10) {
          const firstKey = audioCache.current.keys().next().value;
          const oldUrl = audioCache.current.get(firstKey);
          URL.revokeObjectURL(oldUrl);
          audioCache.current.delete(firstKey);
        }
        audioCache.current.set(cacheKey, audioUrl);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setIsLoading(false);

      audio.onended = () => {
        setNowPlayingId(null);
      };

      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setError("Failed to play audio.");
        setNowPlayingId(null);
      };

      await audio.play();

    } catch (err) {
      console.error("Error playing TTS:", err);
      setError(err.message || "Failed to generate speech.");
      setNowPlayingId(null);
      setIsLoading(false);
    }
  }, [stop, nowPlayingId]);

  const clearCache = useCallback(() => {
    audioCache.current.forEach(url => URL.revokeObjectURL(url));
    audioCache.current.clear();
  }, []);

  const retryPlay = useCallback((text, messageId) => {
    // Invalidate cache for this item and retry
    const cacheKey = text.substring(0, 100);
    const oldUrl = audioCache.current.get(cacheKey);
    if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
        audioCache.current.delete(cacheKey);
    }
    play(text, messageId);
  }, [play]);

  const toggleAutoResponse = useCallback(() => {
    setIsAutoResponseEnabled(prev => {
        // If turning off, stop any current playback
        if (!prev === false) {
            stop();
        }
        return !prev;
    });
  }, [stop]);

  const value = {
    play,
    stop,
    retryPlay,
    clearCache,
    nowPlayingId,
    isPlaying: !!nowPlayingId,
    isLoading,
    error,
    isAutoResponseEnabled,
    toggleAutoResponse,
  };

  return <TTSContext.Provider value={value}>{children}</TTSContext.Provider>;
};

export const useTTS = () => {
  const context = useContext(TTSContext);
  if (!context) {
    throw new Error('useTTS must be used within a TTSProvider');
  }
  return context;
};