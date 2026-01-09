import { useEffect, useRef, useCallback } from 'react';

/**
 * Scroll hook that watches for ACTUAL DOM changes
 * This handles delays from typing indicators and async rendering
 */
export const useChatScroll = (dependencies: any[]) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null); // NEW: Anchor ref
  const isMobileRef = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    isMobileRef.current = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  }, []);

  const scrollToBottom = useCallback(() => {
    // 1. Priority: Scroll the anchor into view (Most reliable for mobile/iOS)
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      // console.log('[SCROLL] Scrolled anchor into view');
      return;
    }
    
    // 2. Fallback: Scroll container (Desktop standard)
    if (scrollRef.current) {
      const element = scrollRef.current;
      element.scrollTop = element.scrollHeight;
      // console.log('[SCROLL] Scrolled scrollTop to:', element.scrollTop);
    }
  }, []);

  // CRITICAL: Use MutationObserver to watch for ACTUAL content changes
  useEffect(() => {
    if (!scrollRef.current) {
      console.log('[SCROLL] Ref not ready, skipping observer setup');
      return;
    }

    const element = scrollRef.current;
    console.log('[SCROLL] Setting up DOM observer');

    // Clean up existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create observer that watches for child nodes AND text changes
    observerRef.current = new MutationObserver((mutations) => {
      // Check if any mutations added nodes OR changed text (streaming)
      const hasNewContent = mutations.some(mutation => 
        (mutation.type === 'childList' && mutation.addedNodes.length > 0) ||
        (mutation.type === 'characterData') // NEW: Watch for text updates
      );

      if (hasNewContent) {
        console.log('[SCROLL] DOM content changed, scrolling...');
        
        // Scroll immediately
        scrollToBottom();
        
        // Additional scrolls for slow rendering
        if (isMobileRef.current) {
          setTimeout(scrollToBottom, 50);
          setTimeout(scrollToBottom, 100);
          setTimeout(scrollToBottom, 200);
          setTimeout(scrollToBottom, 300);
          setTimeout(scrollToBottom, 500);
        } else {
          setTimeout(scrollToBottom, 50);
          setTimeout(scrollToBottom, 100);
        }
      }
    });

    // Start observing the scroll container
    observerRef.current.observe(element, {
      childList: true,     // Watch for child nodes being added/removed
      subtree: true,       // Watch all descendants
      attributes: false,   // Don't watch attribute changes
      characterData: true  // NEW: Watch text content changes (critical for AI streaming)
    });

    // Initial scroll
    scrollToBottom();

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [scrollRef.current, scrollToBottom]);

  // Also scroll when dependencies change (backup mechanism)
  useEffect(() => {
    // We can rely on bottomRef here too if it exists
    if (!scrollRef.current && !bottomRef.current) return;
    
    console.log('[SCROLL] Dependencies changed, scrolling...');
    scrollToBottom();
    
    // Additional delayed scrolls for typing indicator delays
    setTimeout(scrollToBottom, 100);
    setTimeout(scrollToBottom, 300);
    setTimeout(scrollToBottom, 600);  // After typical typing indicator
    setTimeout(scrollToBottom, 1000); // Safety net
  }, dependencies);

  // Window resize (keyboard)
  useEffect(() => {
    if (!isMobileRef.current) return;

    const handleResize = () => {
      if (!scrollRef.current) return;
      console.log('[SCROLL] Window resized');
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 300);
      setTimeout(scrollToBottom, 500);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [scrollToBottom]);

  // Focus (keyboard opening)
  useEffect(() => {
    if (!isMobileRef.current) return;

    const handleFocus = () => {
      if (!scrollRef.current) return;
      console.log('[SCROLL] Input focused');
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 300);
      setTimeout(scrollToBottom, 600);
      setTimeout(scrollToBottom, 900);
    };

    window.addEventListener('focusin', handleFocus);
    return () => window.removeEventListener('focusin', handleFocus);
  }, [scrollToBottom]);

  return { scrollRef, bottomRef, scrollToBottom };
};