import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const TTSContext = createContext();

export const TTSProvider = ({ children }) => {
  const [nowPlayingId, setNowPlayingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const audioCache = useRef(new Map()); // Simple in-memory cache for audio

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setNowPlayingId(null);
    setIsLoading(false);
    setError(null);
  }, []);

  const play = useCallback(async (text, messageId) => {
    // If the requested message is already playing, do nothing.
    // To stop it, the user will click the button again, which calls stop().
    if (nowPlayingId === messageId) return;

    // Stop any currently playing audio before starting the new one.
    stop();

    // Clear any previous errors
    setError(null);
    setIsLoading(true);

    try {
      // Check cache first
      const cacheKey = text.substring(0, 100); // Use first 100 chars as cache key
      let audioUrl = audioCache.current.get(cacheKey);

      if (!audioUrl) {
        // Fetch new audio from API
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
        
        // Cache the audio URL (limit cache size to prevent memory issues)
        if (audioCache.current.size >= 10) {
          // Remove oldest entry
          const firstKey = audioCache.current.keys().next().value;
          const oldUrl = audioCache.current.get(firstKey);
          URL.revokeObjectURL(oldUrl);
          audioCache.current.delete(firstKey);
        }
        audioCache.current.set(cacheKey, audioUrl);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      setNowPlayingId(messageId);
      setIsLoading(false);

      // Set up event listeners
      audio.onloadstart = () => {
        setIsLoading(true);
      };

      audio.oncanplay = () => {
        setIsLoading(false);
      };

      audio.onended = () => {
        setNowPlayingId(null);
        setIsLoading(false);
      };

      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setError("Failed to play audio");
        setNowPlayingId(null);
        setIsLoading(false);
      };

      // Start playback
      await audio.play();

    } catch (error) {
      console.error("Error playing TTS:", error);
      setError(error.message || "Failed to generate speech");
      setNowPlayingId(null);
      setIsLoading(false);
    }
  }, [stop, nowPlayingId]);

  // Cleanup function to revoke all cached URLs
  const clearCache = useCallback(() => {
    audioCache.current.forEach(url => URL.revokeObjectURL(url));
    audioCache.current.clear();
  }, []);

  // Enhanced retry function for failed TTS requests
  const retryPlay = useCallback(async (text, messageId, maxRetries = 2) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await play(text, messageId);
        return; // Success, exit retry loop
      } catch (error) {
        if (attempt === maxRetries) {
          setError(`Failed after ${maxRetries} attempts: ${error.message}`);
          return;
        }
        console.warn(`TTS attempt ${attempt} failed, retrying...`, error.message);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }, [play]);

  const value = { 
    play, 
    stop, 
    retryPlay,
    clearCache,
    nowPlayingId, 
    isPlaying: !!nowPlayingId, 
    isLoading,
    error
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