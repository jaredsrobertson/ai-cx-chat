import { useState, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';

export function useVoiceExperience() {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    const setupSpeechRecognition = useCallback((onResult) => {
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setIsListening(false);
                if (transcript.trim()) {
                    onResult(transcript);
                }
            };
            recognition.onerror = (event) => {
                logger.error('Speech recognition error', event.error);
                setIsListening(false);
            };
            recognition.onend = () => setIsListening(false);
            recognitionRef.current = recognition;
        }
    }, []);
    
    const startListening = (onResultCallback) => {
        if (!recognitionRef.current) {
            setupSpeechRecognition(onResultCallback);
        }
        if (recognitionRef.current && !isListening) {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    return { isListening, startListening, stopListening };
}