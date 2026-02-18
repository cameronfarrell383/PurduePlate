import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { getSession, onAuthChange } from '@/src/utils/auth';
import AuthScreen from './auth';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const [session, setSession] = useState<any>(undefined); // undefined = loading

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    console.log('[AUTH] Checking session...');
    getSession()
      .then((s) => {
        console.log('[AUTH] getSession() returned:', s ? 'SESSION EXISTS' : 'NO SESSION');
        setSession(s ?? null);
      })
      .catch((err) => {
        console.log('[AUTH] getSession() ERROR:', err.message);
        setSession(null);
      });

    const subscription = onAuthChange((s) => {
      console.log('[AUTH] onAuthStateChange fired:', s ? 'SESSION EXISTS' : 'NO SESSION');
      setSession(s ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Loading state: show spinner while fonts load or session check is in progress
  if (!loaded || session === undefined) {
    console.log('[AUTH] Loading state — loaded:', loaded, '| session:', session);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // No session: render auth screen directly, bypassing expo-router
  // (conditional Stack.Screen doesn't actually gate navigation — the router
  // resolves initialRouteName '(tabs)' regardless of which Screen is declared)
  if (!session) {
    console.log('[AUTH] No session — rendering AuthScreen');
    return (
      <>
        <StatusBar style="dark" />
        <AuthScreen />
      </>
    );
  }

  console.log('[AUTH] Session active — rendering tabs');
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
