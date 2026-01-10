import { useEffect, useRef, useCallback } from 'react';

/**
 * Scroll hook optimized for flex-direction: column-reverse.
 * Fixes memory leaks and provides smooth scrolling behavior.
 */
export const useChatScroll = (dependencies: any[]) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMobileRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  // Detect mobile once on mount
  useEffect(() => {
    isMobileRef.current = 
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
      window.innerWidth < 768;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    // Clear pending scroll timeout
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    // Priority: Use scroll anchor
    if (bottomRef.current) {
      try {
        bottomRef.current.scrollIntoView({ behavior, block: 'end' });
      } catch (error) {
        console.error('Scroll error:', error);
      }
      return;
    }
    
    // Fallback: Direct scrollTop manipulation
    if (scrollRef.current) {
      try {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      } catch (error) {
        console.error('Scroll error:', error);
      }
    }
  }, []);

  // Mutation observer for content changes - properly cleaned up
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const observer = new MutationObserver((mutations) => {
      const hasNewContent = mutations.some(mutation => 
        (mutation.type === 'childList' && mutation.addedNodes.length > 0) ||
        (mutation.type === 'characterData')
      );

      if (hasNewContent) {
        scrollToBottom('smooth');
        
        // Mobile keyboard handling with single timeout
        if (isMobileRef.current) {
          scrollTimeoutRef.current = window.setTimeout(() => {
            scrollToBottom('auto');
            scrollTimeoutRef.current = null;
          }, 100);
        }
      }
    });

    observer.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false,
    });

    // Initial scroll
    scrollToBottom('auto');

    // Cleanup function - guaranteed to run
    return () => {
      observer.disconnect();
      
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []); // Only create observer once

  // Dependency-based scrolling
  useEffect(() => {
    scrollToBottom('smooth');
    
    // Single follow-up for reliability
    const timeout = window.setTimeout(() => {
      scrollToBottom('auto');
    }, 100);
    
    return () => window.clearTimeout(timeout);
  }, dependencies);

  // Mobile keyboard handling
  useEffect(() => {
    if (!isMobileRef.current) return;

    const handleResize = () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = window.setTimeout(() => {
        scrollToBottom('auto');
        scrollTimeoutRef.current = null;
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('focusin', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focusin', handleResize);
      
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [scrollToBottom]);

  return { scrollRef, bottomRef, scrollToBottom };
};