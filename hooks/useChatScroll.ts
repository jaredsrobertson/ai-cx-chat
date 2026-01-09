import { useEffect, useLayoutEffect, useRef, useCallback } from 'react';

/**
 * Production-grade chat scroll hook with mobile optimization
 * Uses multiple strategies to ensure reliable scrolling:
 * 1. useLayoutEffect for synchronous DOM updates
 * 2. MutationObserver to detect DOM changes
 * 3. ResizeObserver to detect content size changes
 * 4. Multiple animation frames for React reconciliation
 * 5. Mobile-specific keyboard and viewport handling
 */
export const useChatScroll = (dependencies: any[]) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isUserScrollingRef = useRef(false);
  const lastScrollHeightRef = useRef(0);
  const isMobileRef = useRef(false);

  // Detect mobile on mount
  useEffect(() => {
    isMobileRef.current = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth', force: boolean = false) => {
    if (!scrollRef.current) return;

    const element = scrollRef.current;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    const currentScroll = element.scrollTop;

    // Check if user is near the bottom (within 150px)
    const distanceFromBottom = maxScroll - currentScroll;
    const isNearBottom = distanceFromBottom < 150;

    // Check if content size has changed
    const hasNewContent = lastScrollHeightRef.current !== scrollHeight;
    const newContentHeight = scrollHeight - lastScrollHeightRef.current;

    // On mobile, always use 'auto' behavior for instant scrolling (no animation lag)
    const effectiveBehavior = isMobileRef.current ? 'auto' : behavior;

    // SCROLL LOGIC:
    // 1. Force: Always scroll if explicitly requested
    // 2. Near Bottom: User is reading recent messages -> scroll
    // 3. New Content: If content grew and user WAS at the bottom (distance ≈ new content), scroll
    //    (This fixes the issue where long messages break the 'isNearBottom' check)
    if (force || isNearBottom || (hasNewContent && distanceFromBottom <= newContentHeight + 150)) {
      element.scrollTo({
        top: maxScroll,
        behavior: effectiveBehavior
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

  // Strategy 2.5: Mobile-specific delayed scroll (for keyboard animation)
  useEffect(() => {
    if (isMobileRef.current) {
      // Mobile keyboards take time to animate, add extra delay
      // Increased to 300ms to better handle iOS keyboard animations
      const timer = setTimeout(() => {
        scrollToBottom('auto', true);
      }, 300);
      
      return () => clearTimeout(timer);
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
      setTimeout(() => {
        scrollToBottom('auto', true);
      }, 300); // Wait for keyboard animation
    };

    window.addEventListener('focusin', handleFocusIn);
    
    return () => {
      window.removeEventListener('focusin', handleFocusIn);
    };
  }, [scrollToBottom]);

  return { scrollRef, scrollToBottom };
};