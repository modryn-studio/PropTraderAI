/**
 * RESPONSIVE BREAKPOINTS HOOK
 * 
 * Custom breakpoints optimized for the chat interface with sidebars.
 * 
 * Screen sizes:
 * - mobile: < 768px (FAB-based UI)
 * - tablet: 768-1023px (Summary sidebar only)
 * - desktop: 1024-1279px (Summary + minimized animation)
 * - wide: 1280-1439px (Summary + animation auto-expandable)
 * - ultrawide: >= 1440px (Summary + animation defaults expanded)
 */

import { useState, useEffect, useCallback } from 'react';

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
  wide: 1440,
  ultrawide: 1920,
} as const;

export type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'wide' | 'ultrawide';

interface BreakpointState {
  screenSize: ScreenSize;
  width: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  isUltrawide: boolean;
  showSidebars: boolean;
  defaultAnimationExpanded: boolean;
  animationAutoExpandable: boolean;
}

function getScreenSize(width: number): ScreenSize {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  if (width < BREAKPOINTS.desktop) return 'desktop';
  if (width < BREAKPOINTS.wide) return 'wide';
  return 'ultrawide';
}

export function useResponsiveBreakpoints(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(() => {
    // Default to desktop for SSR
    const defaultWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const screenSize = getScreenSize(defaultWidth);
    
    return {
      screenSize,
      width: defaultWidth,
      isMobile: screenSize === 'mobile',
      isTablet: screenSize === 'tablet',
      isDesktop: screenSize === 'desktop',
      isWide: screenSize === 'wide',
      isUltrawide: screenSize === 'ultrawide',
      showSidebars: screenSize !== 'mobile',
      defaultAnimationExpanded: screenSize === 'ultrawide',
      animationAutoExpandable: screenSize === 'wide' || screenSize === 'ultrawide',
    };
  });

  const updateState = useCallback(() => {
    const width = window.innerWidth;
    const screenSize = getScreenSize(width);
    
    setState({
      screenSize,
      width,
      isMobile: screenSize === 'mobile',
      isTablet: screenSize === 'tablet',
      isDesktop: screenSize === 'desktop',
      isWide: screenSize === 'wide',
      isUltrawide: screenSize === 'ultrawide',
      showSidebars: screenSize !== 'mobile',
      defaultAnimationExpanded: screenSize === 'ultrawide',
      animationAutoExpandable: screenSize === 'wide' || screenSize === 'ultrawide',
    });
  }, []);

  useEffect(() => {
    // Update immediately on mount
    updateState();
    
    // Listen for resize
    window.addEventListener('resize', updateState);
    return () => window.removeEventListener('resize', updateState);
  }, [updateState]);

  return state;
}

/**
 * Hook to detect if mobile keyboard is open
 * Useful for hiding FABs when keyboard is visible
 */
export function useKeyboardVisible(): boolean {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      // If viewport is significantly smaller than window, keyboard is probably open
      setIsKeyboardVisible(windowHeight - viewportHeight > 150);
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  return isKeyboardVisible;
}
