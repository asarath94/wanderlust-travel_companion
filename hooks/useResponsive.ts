import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * Hook to detect if the current device should use mobile layout
 * Returns true for:
 * - Native mobile platforms (iOS/Android)
 * - Web browsers with width <= 768px (mobile/tablet breakpoint)
 */
export function useIsMobile() {
  const { width } = useWindowDimensions();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // On native mobile platforms, always use mobile layout
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      setIsMobile(true);
    } 
    // On web, check screen width (768px is common mobile breakpoint)
    else if (Platform.OS === 'web') {
      setIsMobile(width <= 768);
    }
  }, [width]);

  return isMobile;
}

/**
 * Hook to get responsive breakpoint information
 */
export function useBreakpoint() {
  const { width } = useWindowDimensions();

  return {
    isMobile: width <= 768,
    isTablet: width > 768 && width <= 1024,
    isDesktop: width > 1024,
    width,
  };
}
