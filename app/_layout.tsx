import PreflightChecks from '@/components/PreflightChecks';
import { PatientProvider } from '@/contexts/PatientContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import 'react-native-reanimated';
import '../global.css';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  // set preflighht default to false for now as it is not implemented yet
  const [showPreflight, setShowPreflight] = useState(false);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  if (showPreflight) {
    return <PreflightChecks onComplete={() => setShowPreflight(false)} />;
  }

  return ( 
  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
    <PatientProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </PatientProvider>
  </ThemeProvider>
  );
}
