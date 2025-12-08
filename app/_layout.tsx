import ConnectivityWarning from '@/components/ConnectivityWarning';
import PreflightChecks from '@/components/PreflightChecks';
import { PatientProvider } from '@/contexts/PatientContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  // Enable preflight checks on startup
  const [showPreflight, setShowPreflight] = useState(true);

  // Track app state to trigger when returning to foreground
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const lastRunRef = useRef<number>(0);

  // effect adds listener to app state that is removed on component unmount
  useEffect(() => {
    const MIN_INTERVAL_MS = 60 * 1000; // don't re-run more than once per minute

    const handleAppStateChange = (nextState: AppStateStatus) => {
      const prev = appState.current;
      appState.current = nextState;

      // We only care about transitions INTO 'active'
      // (iOS: 'background' -> 'inactive' -> 'active'; Android: 'background' -> 'active')
      const becameActive = (prev === 'background' || prev === 'inactive') && nextState === 'active';

      if (becameActive) {
        const now = Date.now();
        if (now - lastRunRef.current > MIN_INTERVAL_MS) {
          lastRunRef.current = now;
          setShowPreflight(true);
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);
  

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return ( 
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <PatientProvider>
        <ConnectivityWarning />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />

        {/* Full-scren overlay: render Preflight over everything when needed */}
        {showPreflight && (
          <View className="absolute inset-0 z-50 bg-white">
            <PreflightChecks onComplete={() => setShowPreflight(false)} />
          </View>
        )
        }
      </PatientProvider>
    </ThemeProvider>
  );
}
