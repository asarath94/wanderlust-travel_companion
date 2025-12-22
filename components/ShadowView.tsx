/**
 * Shadow-enabled components for React Native
 * 
 * These components wrap standard React Native components and automatically apply
 * native shadow styles when Tailwind shadow classes are detected.
 */

import React from 'react';
import {
    Platform,
    TouchableOpacity as RNTouchableOpacity,
    View as RNView,
    TouchableOpacityProps,
    ViewProps,
    ViewStyle
} from 'react-native';

// Shadow styles for native platforms
// For Android, we use a lower elevation to minimize the corner artifact
const nativeShadowStyles: Record<string, ViewStyle> = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }) as ViewStyle,
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }) as ViewStyle,
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 15,
    },
    android: {
      elevation: 3,
    },
    default: {},
  }) as ViewStyle,
  xl: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.2,
      shadowRadius: 25,
    },
    android: {
      elevation: 5,
    },
    default: {},
  }) as ViewStyle,
};

// Detect shadow level from className
function detectShadowLevel(className?: string): string | null {
  if (!className) return null;
  
  if (className.includes('shadow-2xl') || className.includes('shadow-xl')) return 'xl';
  if (className.includes('shadow-lg')) return 'lg';
  if (className.includes('shadow-md')) return 'md';
  if (className.includes('shadow-sm')) return 'sm';
  // Check for plain 'shadow' but not as part of another word
  if (/\bshadow\b/.test(className) && !className.includes('shadow-')) return 'md';
  
  return null;
}

interface ShadowViewProps extends ViewProps {
  className?: string;
}

export const View = React.forwardRef<RNView, ShadowViewProps>(
  ({ className, style, ...props }, ref) => {
    // On web, shadows work via CSS, so no modification needed
    if (Platform.OS === 'web') {
      return <RNView ref={ref} className={className} style={style} {...props} />;
    }

    // On native, detect and apply shadow styles
    const shadowLevel = detectShadowLevel(className);
    const shadowStyle = shadowLevel ? nativeShadowStyles[shadowLevel] : undefined;

    return (
      <RNView
        ref={ref}
        className={className}
        style={shadowStyle ? [shadowStyle, style] : style}
        {...props}
      />
    );
  }
);

View.displayName = 'ShadowView';

// TouchableOpacity with shadow support
interface ShadowTouchableOpacityProps extends TouchableOpacityProps {
  className?: string;
}

export function TouchableOpacity({ className, style, ...props }: ShadowTouchableOpacityProps) {
  // On web, shadows work via CSS, so no modification needed
  if (Platform.OS === 'web') {
    return <RNTouchableOpacity className={className} style={style} {...props} />;
  }

  // On native, detect and apply shadow styles
  const shadowLevel = detectShadowLevel(className);
  const shadowStyle = shadowLevel ? nativeShadowStyles[shadowLevel] : undefined;

  return (
    <RNTouchableOpacity
      className={className}
      style={shadowStyle ? [shadowStyle, style] : style}
      {...props}
    />
  );
}

export default View;
