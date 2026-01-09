import { useEffect, useLayoutEffect, useRef, useCallback } from 'react';

/**
 * Production-grade chat scroll hook with mobile optimization
 * Uses multiple strategies to ensure reliable scrolling:
 * 1. useLayoutEffect for synchronous DOM updates
 * 2. MutationObserver to detect DOM changes
 * 3. ResizeObserver to detect content size changes
 * 4. IntersectionObserver to detect content visibility
 * 5. Multiple animation frames for React reconciliation
 * 6. Mobile-specific keyboard and viewport handling
 */
export const useChatScroll = (dependencies: any[]) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const isUserScrollingRef = useRef(false);
  const lastScrollHeightRef = useRef(0);
  const isMobileRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile on mount
  useEffect(() => {
    isMobileRef.current = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth', force: boolean = false) => {
    if (!scrollRef.current || !sentinelRef.current) return;

    const container = scrollRef.current;
    const sentinel = sentinelRef.current;

    // On mobile, always use 'auto' behavior for instant scrolling (no animation lag)
    const effectiveBehavior = isMobileRef.current ? 'auto' : behavior;

    // Calculate scroll position to show sentinel (last element) above input
    const containerRect = container.getBoundingClientRect();
    const sentinelRect = sentinel.getBoundingClientRect();
    
    // Get current scroll position
    const currentScroll = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    
    // Check if near bottom
    const isNearBottom = maxScroll - currentScroll < 150;

    // Force scroll if requested, or if near bottom, or if new content appeared
    if (force || isNearBottom || lastScrollHeightRef.current !== scrollHeight) {
      // Scroll to absolute bottom
      container.scrollTop = maxScroll;
      
      // Use scrollIntoView on sentinel for more reliable positioning
      sentinel.scrollIntoView({ 
        behavior: effectiveBehavior, 
        block: 'end',
        inline: 'nearest'
      });
      
      lastScrollHeightRef.current = scrollHeight;
    }
  }, []);

  // Strategy 1: Synchronous scroll with useLayoutEffect (runs before browser paint)
  useLayoutEffect(() => {
    scrollToBottom('auto', true); // Force scroll on layout
  }, dependencies);

  // Strategy 2: Async scroll with multiple requestAnimationFrame
  useEffect(() => {
    // Cancel any pending scroll
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // First RAF - after React updates
    requestAnimationFrame(() => {
      // Second RAF - after browser layout
      requestAnimationFrame(() => {
        // Third RAF - after browser paint (handles slow renders)
        requestAnimationFrame(() => {
          scrollToBottom('smooth', true);
          
          // Fourth RAF - extra safety for mobile
          if (isMobileRef.current) {
            requestAnimationFrame(() => {
              scrollToBottom('auto', true);
            });
          }
        });
      });
    });
  }, dependencies);

  // Strategy 2.5: Mobile-specific aggressive delayed scroll (for keyboard animation)
  useEffect(() => {
    if (isMobileRef.current) {
      // Multiple timeouts to catch keyboard at different animation stages
      const timers = [100, 200, 350, 500].map(delay => 
        setTimeout(() => {
          scrollToBottom('auto', true);
        }, delay)
      );
      
      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
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
        // Immediate scroll
        requestAnimationFrame(() => {
          scrollToBottom('auto', true);
        });
        
        // Delayed scroll for content that renders slowly
        setTimeout(() => {
          scrollToBottom('auto', true);
        }, 100);
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
        scrollToBottom('auto', true);
      });
    });

    resizeObserverRef.current.observe(element);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [scrollToBottom]);

  // Strategy 4.5: IntersectionObserver to detect when sentinel becomes visible
  useEffect(() => {
    if (!scrollRef.current || !sentinelRef.current) return;

    const sentinel = sentinelRef.current;

    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If sentinel is not fully visible, scroll to it
          if (!entry.isIntersecting || entry.intersectionRatio < 1) {
            scrollToBottom('auto', true);
          }
        });
      },
      {
        root: scrollRef.current,
        threshold: [0, 0.5, 1.0],
        rootMargin: '0px 0px -50px 0px' // Account for input area height
      }
    );

    intersectionObserverRef.current.observe(sentinel);

    return () => {
      intersectionObserverRef.current?.disconnect();
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
    
    // Also listen for touch events on mobile
    if (isMobileRef.current) {
      element.addEventListener('touchstart', () => {
        isUserScrollingRef.current = true;
      }, { passive: true });
      
      element.addEventListener('touchend', handleScroll, { passive: true });
    }

    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (isMobileRef.current) {
        element.removeEventListener('touchstart', handleScroll);
        element.removeEventListener('touchend', handleScroll);
      }
    };
  }, []);

  // Strategy 6: Mobile keyboard detection using visualViewport API
  useEffect(() => {
    if (!isMobileRef.current || typeof window === 'undefined') return;
    
    // Use visualViewport API to detect keyboard open/close
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleViewportResize = () => {
      // When keyboard opens, viewport height shrinks
      // Scroll after a brief delay to let the browser settle
      setTimeout(() => {
        scrollToBottom('auto', true);
      }, 100);
    };

    viewport.addEventListener('resize', handleViewportResize);
    
    return () => {
      viewport.removeEventListener('resize', handleViewportResize);
    };
  }, [scrollToBottom]);

  // Strategy 7: Focus event handling (when input is focused, keyboard opens)
  useEffect(() => {
    if (!isMobileRef.current) return;

    const handleFocusIn = () => {
      // Input focused, keyboard will open
      // Multiple delays to catch keyboard at different animation stages
      [100, 250, 400, 600].forEach(delay => {
        setTimeout(() => {
          scrollToBottom('auto', true);
        }, delay);
      });
    };

    window.addEventListener('focusin', handleFocusIn);
    
    return () => {
      window.removeEventListener('focusin', handleFocusIn);
    };
  }, [scrollToBottom]);

  return { scrollRef, sentinelRef, scrollToBottom };
};