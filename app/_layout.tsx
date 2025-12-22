import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import '../global.css';


import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '../context/AuthContext';

// DEBUG: Check if styles are registered and can be found

// // Wait a moment for styles to register, then check
// // DEBUG: Inspect registered styles format
// setTimeout(() => {
//   console.log("=== STYLE FORMAT DEBUG ===");
  
//   // Try different lookup methods
//   const testClasses = ["bg-blue-500", "bg-blue-900", "text-white", "flex-1", "p-4"];
  
//   for (const cls of testClasses) {
//     const style = StyleSheet.getGlobalStyle?.(cls);
//     console.log(`"${cls}":`, style);
//   }
  
//   // Try to peek at internal state if possible
//   if ((StyleSheet as any)._styles) {
//     console.log("Available style keys:", Object.keys((StyleSheet as any)._styles).slice(0, 20));
//   }
//   if ((StyleSheet as any).styles) {
//     console.log("Available style keys:", Object.keys((StyleSheet as any).styles).slice(0, 20));
//   }
// }, 2000);

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Cinzel-SemiBold': require('../assets/fonts/Cinzel-SemiBold.ttf'),
    'Montserrat-SemiBold': require('../assets/fonts/Montserrat-SemiBold.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
