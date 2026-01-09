import { useEffect, useRef, useCallback } from 'react';

/**
 * Scroll hook that watches for ACTUAL DOM changes
 * This handles delays from typing indicators and async rendering
 */
export const useChatScroll = (dependencies: any[]) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMobileRef = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    isMobileRef.current = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  }, []);

  // UPDATED: Accepts 'behavior' to toggle between smooth (for messages) and auto (for keyboard fixes)
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    // 1. Priority: Scroll the anchor into view (Most reliable for mobile/iOS)
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior, block: 'end' });
      return;
    }
    
    // 2. Fallback: Scroll container (Desktop standard)
    if (scrollRef.current) {
      const element = scrollRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, []);

  // CRITICAL: Use MutationObserver to watch for ACTUAL content changes
  useEffect(() => {
    if (!scrollRef.current) return;

    const element = scrollRef.current;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new MutationObserver((mutations) => {
      const hasNewContent = mutations.some(mutation => 
        (mutation.type === 'childList' && mutation.addedNodes.length > 0) ||
        (mutation.type === 'characterData')
      );

      if (hasNewContent) {
        // New message arrives? SCROLL SMOOTHLY
        scrollToBottom('smooth');
        
        // FIX #1: The "Race Condition"
        // On mobile, force INSTANT ('auto') scrolls after short delays.
        // This ensures if the keyboard is animating up, we snap to bottom
        // instead of trying to animate simultaneously (which often fails).
        if (isMobileRef.current) {
          setTimeout(() => scrollToBottom('auto'), 100);
          setTimeout(() => scrollToBottom('auto'), 300);
          setTimeout(() => scrollToBottom('auto'), 500);
        }
      }
    });

    observerRef.current.observe(element, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: true 
    });

    scrollToBottom('auto'); // Initial load is instant

    return () => observerRef.current?.disconnect();
  }, [scrollRef.current, scrollToBottom]);

  // Dependency change backup (e.g. typing indicator toggles)
  useEffect(() => {
    scrollToBottom('smooth');
    
    // Safety nets for layout shifts
    setTimeout(() => scrollToBottom('smooth'), 100);
    setTimeout(() => scrollToBottom('smooth'), 400); 
  }, dependencies);

  // Window resize (Software Keyboard opening/closing)
  useEffect(() => {
    if (!isMobileRef.current) return;

    const handleResize = () => {
      // Keyboard movement is jerky; use 'auto' to snap to position immediately
      setTimeout(() => scrollToBottom('auto'), 100);
      setTimeout(() => scrollToBottom('auto'), 300);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [scrollToBottom]);

  // Input Focus (Alternative keyboard trigger)
  useEffect(() => {
    if (!isMobileRef.current) return;

    const handleFocus = () => {
      setTimeout(() => scrollToBottom('auto'), 100);
      setTimeout(() => scrollToBottom('auto'), 300);
    };

    window.addEventListener('focusin', handleFocus);
    return () => window.removeEventListener('focusin', handleFocus);
  }, [scrollToBottom]);

  return { scrollRef, bottomRef, scrollToBottom };
};