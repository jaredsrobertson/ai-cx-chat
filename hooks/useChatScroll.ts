import { useEffect, useLayoutEffect, useRef, useCallback } from 'react';

/**
 * Production-grade chat scroll hook
 * Uses multiple strategies to ensure reliable scrolling:
 * 1. useLayoutEffect for synchronous DOM updates
 * 2. MutationObserver to detect DOM changes
 * 3. ResizeObserver to detect content size changes
 * 4. Multiple animation frames for React reconciliation
 */
export const useChatScroll = (dependencies: any[]) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isUserScrollingRef = useRef(false);
  const lastScrollHeightRef = useRef(0);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!scrollRef.current) return;

    const element = scrollRef.current;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    // Check if user has manually scrolled up
    const currentScroll = element.scrollTop;
    const isNearBottom = maxScroll - currentScroll < 150; // Within 150px of bottom

    // Only auto-scroll if user is near bottom or content just appeared
    if (isNearBottom || lastScrollHeightRef.current !== scrollHeight) {
      element.scrollTo({
        top: maxScroll,
        behavior: behavior
      });
      lastScrollHeightRef.current = scrollHeight;
    }
  }, []);

  // Strategy 1: Synchronous scroll with useLayoutEffect (runs before browser paint)
  useLayoutEffect(() => {
    scrollToBottom('auto'); // Use instant scroll for layout effect
  }, dependencies);

  // Strategy 2: Async scroll with multiple requestAnimationFrame
  useEffect(() => {
    // First RAF - after React updates
    requestAnimationFrame(() => {
      // Second RAF - after browser layout
      requestAnimationFrame(() => {
        // Third RAF - after browser paint (handles slow renders)
        requestAnimationFrame(() => {
          scrollToBottom('smooth');
        });
      });
    });
  }, dependencies);

  // Strategy 3: MutationObserver to watch for DOM changes
  useEffect(() => {
    if (!scrollRef.current) return;

    const element = scrollRef.current;

    // Watch for any DOM mutations (new messages, quick replies, etc.)
    observerRef.current = new MutationObserver((mutations) => {
      // Only scroll if new content was added
      const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
      if (hasAddedNodes) {
        requestAnimationFrame(() => {
          scrollToBottom('smooth');
        });
      }
    });

    observerRef.current.observe(element, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [scrollToBottom]);

  // Strategy 4: ResizeObserver to handle dynamic content (images, quick replies)
  useEffect(() => {
    if (!scrollRef.current) return;

    const element = scrollRef.current;

    resizeObserverRef.current = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        scrollToBottom('smooth');
      });
    });

    resizeObserverRef.current.observe(element);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [scrollToBottom]);

  // Strategy 5: Detect user manual scrolling to prevent auto-scroll interruption
  useEffect(() => {
    if (!scrollRef.current) return;

    const element = scrollRef.current;

    const handleScroll = () => {
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      const scrollTop = element.scrollTop;
      const maxScroll = scrollHeight - clientHeight;

      // User is manually scrolling if they're not at the bottom
      isUserScrollingRef.current = scrollTop < maxScroll - 10;
    };

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return { scrollRef, scrollToBottom };
};