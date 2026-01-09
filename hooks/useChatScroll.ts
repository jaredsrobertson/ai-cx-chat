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

  const scrollToBottom = useCallback(() => {
    // 1. Priority: Scroll the anchor into view (Most reliable for mobile/iOS)
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
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
    if (!scrollRef.current) {
      return;
    }

    const element = scrollRef.current;

    // Clean up existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create observer that watches for child nodes AND text changes
    observerRef.current = new MutationObserver((mutations) => {
      // Check if any mutations added nodes OR changed text (streaming)
      const hasNewContent = mutations.some(mutation => 
        (mutation.type === 'childList' && mutation.addedNodes.length > 0) ||
        (mutation.type === 'characterData') // Watch for text updates
      );

      if (hasNewContent) {
        // Scroll immediately
        scrollToBottom();
        
        // Additional scrolls for slow rendering on mobile
        if (isMobileRef.current) {
          setTimeout(scrollToBottom, 100);
          setTimeout(scrollToBottom, 300);
          setTimeout(scrollToBottom, 500);
        }
      }
    });

    // Start observing the scroll container
    observerRef.current.observe(element, {
      childList: true,     // Watch for child nodes being added/removed
      subtree: true,       // Watch all descendants
      attributes: false,   // Don't watch attribute changes
      characterData: true  // Critical: Watch text content changes (AI streaming)
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
    scrollToBottom();
    
    // Additional delayed scrolls for typing indicator delays
    setTimeout(scrollToBottom, 100);
    setTimeout(scrollToBottom, 300);
    setTimeout(scrollToBottom, 600);
  }, dependencies);

  // Window resize (keyboard)
  useEffect(() => {
    if (!isMobileRef.current) return;

    const handleResize = () => {
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 300);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [scrollToBottom]);

  // Focus (keyboard opening)
  useEffect(() => {
    if (!isMobileRef.current) return;

    const handleFocus = () => {
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 300);
    };

    window.addEventListener('focusin', handleFocus);
    return () => window.removeEventListener('focusin', handleFocus);
  }, [scrollToBottom]);

  return { scrollRef, bottomRef, scrollToBottom };
};