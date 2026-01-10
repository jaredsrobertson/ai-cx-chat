import { useEffect, useRef, useCallback } from 'react';

/**
 * Scroll hook optimized for flex-direction: column-reverse.
 * In column-reverse, the 'bottom' of the chat is the 'start' of the container.
 * This makes the browser natively anchor to the bottom.
 */
export const useChatScroll = (dependencies: any[]) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMobileRef = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    isMobileRef.current = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    // 1. Priority: Scroll the anchor into view
    // In column-reverse, the anchor is at the DOM 'start' (Visual Bottom)
    // So we scroll it into view.
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior, block: 'end' });
      return;
    }
    
    // 2. Fallback: ScrollTop (Standard)
    // Note: In some browsers, column-reverse inverts scrollTop, but scrollIntoView is safer.
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Watch for content changes (Streaming text or new nodes)
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
        scrollToBottom('smooth');
        
        // Race condition fix for mobile keyboards
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

    scrollToBottom('auto'); // Initial load

    return () => observerRef.current?.disconnect();
  }, [scrollRef.current, scrollToBottom]);

  // Dependency change backup
  useEffect(() => {
    scrollToBottom('smooth');
    setTimeout(() => scrollToBottom('smooth'), 100);
    setTimeout(() => scrollToBottom('auto'), 400); 
  }, dependencies);

  // Mobile Keyboard handling
  useEffect(() => {
    if (!isMobileRef.current) return;

    const handleEvent = () => {
      setTimeout(() => scrollToBottom('auto'), 100);
      setTimeout(() => scrollToBottom('auto'), 300);
    };

    window.addEventListener('resize', handleEvent);
    window.addEventListener('focusin', handleEvent);
    
    return () => {
      window.removeEventListener('resize', handleEvent);
      window.removeEventListener('focusin', handleEvent);
    };
  }, [scrollToBottom]);

  return { scrollRef, bottomRef, scrollToBottom };
};