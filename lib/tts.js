// lib/tts.js - Text-to-Speech utility function
export function speakText(text) {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    // Cancel any previous speech to prevent overlap
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}