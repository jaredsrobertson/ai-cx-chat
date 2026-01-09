import { useEffect, useRef, useCallback } from 'react';

/**
 * Simple, aggressive chat scroll hook
 * No observers, no complexity - just scroll to bottom repeatedly until it sticks
 */
export const useChatScroll = (dependencies: any[]) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobileRef = useRef(false);

  useEffect(() => {
    isMobileRef.current = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;

    const element = scrollRef.current;
    
    // Simple and direct: set scrollTop to maximum possible value
    element.scrollTop = element.scrollHeight;
  }, []);

  // Main scroll effect - triggers on any dependency change
  useEffect(() => {
    // Immediate scroll
    scrollToBottom();

    // Aggressive repeated scrolls for mobile (keyboard animation)
    if (isMobileRef.current) {
      const delays = [0, 50, 100, 150, 200, 300, 400, 500, 600, 800, 1000];
      const timeouts = delays.map(delay =>
        setTimeout(scrollToBottom, delay)
      );

      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout));
      };
    } else {
      // Desktop: just a few attempts
      const delays = [0, 50, 100, 200];
      const timeouts = delays.map(delay =>
        setTimeout(scrollToBottom, delay)
      );

      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout));
      };
    }
  }, dependencies);

  // Scroll on window resize (keyboard open/close)
  useEffect(() => {
    if (!isMobileRef.current) return;

    const handleResize = () => {
      // When keyboard opens/closes, scroll after brief delays
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 300);
      setTimeout(scrollToBottom, 500);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [scrollToBottom]);

  // Scroll on focus (keyboard opening)
  useEffect(() => {
    if (!isMobileRef.current) return;

    const handleFocus = () => {
      // Aggressive scrolling when input is focused
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 200);
      setTimeout(scrollToBottom, 400);
      setTimeout(scrollToBottom, 600);
      setTimeout(scrollToBottom, 800);
    };

    window.addEventListener('focusin', handleFocus);
    
    return () => {
      window.removeEventListener('focusin', handleFocus);
    };
  }, [scrollToBottom]);

  return { scrollRef, scrollToBottom };
};