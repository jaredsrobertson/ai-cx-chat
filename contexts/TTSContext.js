import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { CONFIG, logger } from '../lib/utils';

const TTSContext = createContext();

export const TTSProvider = ({ children }) => {
  const [nowPlayingId, setNowPlayingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAutoResponseEnabled, setIsAutoResponseEnabled] = useState(false);
  
  const audioRef = useRef(null);
  const audioCache = useRef(new Map());

  // Cleanup audio resources
  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  // Clear audio cache with proper cleanup
  const clearCache = useCallback(() => {
    audioCache.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        logger.warn('Failed to revoke audio URL', { error: e.message });
      }
    });
    audioCache.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      clearCache();
    };
  }, [cleanupAudio, clearCache]);

  const stop = useCallback(() => {
    cleanupAudio();
    setNowPlayingId(null);
    setIsLoading(false);
  }, [cleanupAudio]);

  const play = useCallback(async (text, messageId) => {
    if (nowPlayingId === messageId) return;
    
    stop();
    setError(null);
    setIsLoading(true);
    setNowPlayingId(messageId);

    try {
      const cacheKey = text.substring(0, 100);
      let audioUrl = audioCache.current.get(cacheKey);

      // Fetch audio if not cached
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
        
        // Cache management - remove oldest if cache is full
        if (audioCache.current.size >= CONFIG.TTS.CACHE_SIZE) {
          const firstKey = audioCache.current.keys().next().value;
          const oldUrl = audioCache.current.get(firstKey);
          URL.revokeObjectURL(oldUrl);
          audioCache.current.delete(firstKey);
        }
        
        audioCache.current.set(cacheKey, audioUrl);
      }

      // Play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setIsLoading(false);

      // Setup event handlers
      audio.onended = () => {
        setNowPlayingId(null);
        audioRef.current = null;
      };

      audio.onerror = (e) => {
        logger.error('Audio playback error:', e);
        setError('Failed to play audio.');
        setNowPlayingId(null);
        audioRef.current = null;
      };

      await audio.play();
      logger.debug('TTS playback started', { messageId, textLength: text.length });

    } catch (err) {
      logger.error('TTS generation failed:', err, { messageId, textLength: text.length });
      setError(err.message || 'Failed to generate speech.');
      setNowPlayingId(null);
      setIsLoading(false);
    }
  }, [stop, nowPlayingId]);

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
      const newValue = !prev;
      if (!newValue) {
        stop(); // Stop current playback when disabling auto-response
      }
      logger.debug('Auto-response toggled', { enabled: newValue });
      return newValue;
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