import { useEffect, useRef, useCallback } from 'react';

/**
 * Simple scroll hook that properly waits for ref to attach
 */
export const useChatScroll = (dependencies: any[]) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMobileRef = useRef(false);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    isMobileRef.current = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) {
      return; // Silently return if ref not ready
    }

    const element = scrollRef.current;
    const performScroll = () => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ block: 'end', inline: 'nearest' });
      }
      element.scrollTop = element.scrollHeight;
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(performScroll);
    });
  }, []);

  // CRITICAL: Separate effect that only runs when ref becomes available
  useEffect(() => {
    if (scrollRef.current && !isInitializedRef.current) {
      console.log('[SCROLL] ✅ Ref attached, initializing');
      isInitializedRef.current = true;
      scrollToBottom();
    }
  }, [scrollRef.current, scrollToBottom]);

  // Main scroll effect - only runs if ref is available
  useEffect(() => {
    if (!scrollRef.current) {
      console.log('[SCROLL] ⏳ Ref not ready yet, skipping');
      return;
    }

    console.log('[SCROLL] Effect triggered, scrolling...');
    
    // Immediate scroll
    scrollToBottom();

    // Repeated scrolls based on device
    const delays = isMobileRef.current 
      ? [50, 100, 150, 200, 300, 400, 500, 600, 800, 1000]
      : [50, 100, 200];
    
    const timeouts = delays.map(delay =>
      setTimeout(scrollToBottom, delay)
    );

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, dependencies);

  // Scroll on window resize (keyboard)
  useEffect(() => {
    if (!isMobileRef.current) return;

    const handleResize = () => {
      if (!scrollRef.current) return;
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 300);
      setTimeout(scrollToBottom, 500);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [scrollToBottom]);

  // Scroll on focus (keyboard opening)
  useEffect(() => {
    if (!isMobileRef.current) return;

    const handleFocus = () => {
      if (!scrollRef.current) return;
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 200);
      setTimeout(scrollToBottom, 400);
      setTimeout(scrollToBottom, 600);
      setTimeout(scrollToBottom, 800);
    };

    window.addEventListener('focusin', handleFocus);
    return () => window.removeEventListener('focusin', handleFocus);
  }, [scrollToBottom]);

  return { scrollRef, bottomRef, scrollToBottom };
};
