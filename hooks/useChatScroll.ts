import { useEffect, useRef, useCallback } from 'react';

/**
 * DEBUG VERSION - Scroll hook with extensive logging
 */
export const useChatScroll = (dependencies: any[]) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobileRef = useRef(false);

  useEffect(() => {
    isMobileRef.current = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    console.log('[SCROLL] Device type:', isMobileRef.current ? 'MOBILE' : 'DESKTOP');
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) {
      console.error('[SCROLL] ❌ scrollRef.current is NULL');
      return;
    }

    const element = scrollRef.current;
    
    // Log BEFORE scroll
    console.log('[SCROLL] BEFORE:', {
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      offsetHeight: element.offsetHeight,
      maxScroll: element.scrollHeight - element.clientHeight,
      hasOverflow: element.scrollHeight > element.clientHeight,
      computedOverflow: window.getComputedStyle(element).overflowY,
      elementTag: element.tagName,
      elementClass: element.className
    });

    // Check if element is actually scrollable
    if (element.scrollHeight <= element.clientHeight) {
      console.warn('[SCROLL] ⚠️ Element has no overflow! scrollHeight <= clientHeight');
    }
    
    // Perform scroll
    const targetScroll = element.scrollHeight;
    element.scrollTop = targetScroll;
    
    // Log AFTER scroll (next tick)
    setTimeout(() => {
      console.log('[SCROLL] AFTER:', {
        scrollTop: element.scrollTop,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        reachedBottom: Math.abs(element.scrollTop - (element.scrollHeight - element.clientHeight)) < 2,
        difference: (element.scrollHeight - element.clientHeight) - element.scrollTop
      });
      
      if (element.scrollTop < element.scrollHeight - element.clientHeight - 10) {
        console.error('[SCROLL] ❌ SCROLL FAILED! Still not at bottom');
      } else {
        console.log('[SCROLL] ✅ Successfully scrolled to bottom');
      }
    }, 50);
  }, []);

  // Main scroll effect
  useEffect(() => {
    console.log('[SCROLL] Effect triggered, dependencies changed');
    
    // Check if element exists
    if (!scrollRef.current) {
      console.error('[SCROLL] ❌ scrollRef.current is NULL in effect');
      return;
    }

    // Immediate scroll
    scrollToBottom();

    // Aggressive repeated scrolls
    const delays = isMobileRef.current 
      ? [0, 50, 100, 150, 200, 300, 400, 500, 600, 800, 1000]
      : [0, 50, 100, 200];
    
    console.log(`[SCROLL] Setting up ${delays.length} scroll attempts`);
    
    const timeouts = delays.map(delay =>
      setTimeout(() => {
        console.log(`[SCROLL] Attempt at ${delay}ms`);
        scrollToBottom();
      }, delay)
    );

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, dependencies);

  // Log when scrollRef is attached
  useEffect(() => {
    if (scrollRef.current) {
      console.log('[SCROLL] ✅ scrollRef attached to element:', {
        tag: scrollRef.current.tagName,
        id: scrollRef.current.id,
        className: scrollRef.current.className,
        hasParent: !!scrollRef.current.parentElement,
        parentTag: scrollRef.current.parentElement?.tagName
      });
    }
  }, [scrollRef.current]);

  // Scroll on window resize (keyboard open/close)
  useEffect(() => {
    if (!isMobileRef.current) return;

    const handleResize = () => {
      console.log('[SCROLL] Window resized (keyboard?):', {
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth
      });
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 300);
      setTimeout(scrollToBottom, 500);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [scrollToBottom]);

  // Scroll on focus
  useEffect(() => {
    if (!isMobileRef.current) return;

    const handleFocus = () => {
      console.log('[SCROLL] Input focused (keyboard opening)');
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