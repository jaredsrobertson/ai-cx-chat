import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const TTSContext = createContext();

export const TTSProvider = ({ children }) => {
  const [nowPlayingId, setNowPlayingId] = useState(null);
  const audioRef = useRef(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setNowPlayingId(null);
  }, []);

  const play = useCallback(async (text, messageId) => {
    // If the requested message is already playing, do nothing.
    // To stop it, the user will click the button again, which calls stop().
    if (nowPlayingId === messageId) return;

    // Stop any currently playing audio before starting the new one.
    stop();

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      
      setNowPlayingId(messageId);

      audio.play();

      audio.onended = () => {
        setNowPlayingId(null);
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error("Error playing TTS:", error);
      setNowPlayingId(null);
    }
  }, [stop, nowPlayingId]);

  const value = { play, stop, nowPlayingId, isPlaying: !!nowPlayingId };

  return <TTSContext.Provider value={value}>{children}</TTSContext.Provider>;
};

export const useTTS = () => {
  const context = useContext(TTSContext);
  if (!context) {
    throw new Error('useTTS must be used within a TTSProvider');
  }
  return context;
};