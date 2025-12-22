import React from 'react';
import { Platform, StyleProp, View, ViewProps, ViewStyle } from 'react-native';

// Shadow styles for native platforms
const nativeShadowStyles: Record<string, ViewStyle> = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
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
      elevation: 4,
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
      elevation: 8,
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
      elevation: 12,
    },
    default: {},
  }) as ViewStyle,
};

// Map Tailwind shadow classes to our shadow levels
const shadowClassMap: Record<string, string> = {
  'shadow-sm': 'sm',
  'shadow-md': 'md',
  'shadow-lg': 'lg',
  'shadow-xl': 'xl',
  'shadow-2xl': 'xl',
  'shadow': 'md', // default shadow
};

interface ShadowBoxProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  shadowLevel?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * ShadowBox - A cross-platform shadow component
 * 
 * Usage:
 * 1. Explicit: <ShadowBox shadowLevel="lg">...</ShadowBox>
 * 2. Auto-detect from className: <ShadowBox className="... shadow-lg ...">...</ShadowBox>
 */
export function ShadowBox({ children, className, style, shadowLevel, ...props }: ShadowBoxProps) {
  // Auto-detect shadow level from className if not explicitly provided
  let detectedLevel = shadowLevel;
  
  if (!detectedLevel && className) {
    for (const [shadowClass, level] of Object.entries(shadowClassMap)) {
      if (className.includes(shadowClass)) {
        detectedLevel = level as 'sm' | 'md' | 'lg' | 'xl';
        break;
      }
    }
  }
  
  // Default to 'md' if no shadow level detected
  const finalLevel = detectedLevel || 'md';
  
  // On web, shadows work via CSS classes, so we don't need native styles
  // On native, we apply the shadow styles
  const shadowStyle = Platform.OS !== 'web' ? nativeShadowStyles[finalLevel] : undefined;
  
  return (
    <View className={className} style={[shadowStyle, style]} {...props}>
      {children}
    </View>
  );
}

export default ShadowBox;
