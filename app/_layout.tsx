import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import store, { RootState } from '../src/core/store/store';
import * as SecureStore from 'expo-secure-store';
import { setCredentials, setCompanyTheme } from '../src/core/store/auth.slice';
import { fetchCompanyTheme } from '../src/core/theme/companyTheme';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AppThemeProvider } from '../src/core/theme/ThemeContext';

const queryClient = new QueryClient();

// Keep the native splash visible until the company theme (and auth state) has
// loaded, so the very first screen the user sees is already correctly
// branded for this deployment — not a generic flash before switching over.
// (The native splash IMAGE itself is still a build-time asset per Expo/RN
// platform constraints — swap assets/logo.png + app.json's "splash" config
// per client at build time. This only controls how long it stays up for.)
SplashScreen.preventAutoHideAsync().catch(() => {});

function NavigationGuard() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Determine if we are in the auth segment or root
    const inAuthGroup = segments[0] === '(auth)';
    const onForceChangePassword = segments[1] === 'force-change-password';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (isAuthenticated && user?.mustChangePassword && !onForceChangePassword) {
      // Force the user to set a new password before using the app
      router.replace('/(auth)/force-change-password');
    } else if (isAuthenticated && !user?.mustChangePassword && (inAuthGroup)) {
      // Redirect to dashboard if authenticated and not forced to change password
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, user?.mustChangePassword, segments]);

  return <Slot />;
}

function Initializer() {
  const router = useRouter();

  useEffect(() => {
    // Company branding (color + logo) — public endpoint, doesn't need auth,
    // so it loads in parallel with the login bootstrap below. Race it against
    // a short timeout so a slow/offline network never leaves the splash stuck.
    const themeReady = Promise.race([
      fetchCompanyTheme().then((theme) => {
        if (theme) store.dispatch(setCompanyTheme(theme));
      }),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);

    const bootstrapAsync = async () => {
      try {
        // Attempt to auto-login from stored tokens
        const token = await SecureStore.getItemAsync('authToken');
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        const userStr = await SecureStore.getItemAsync('userProfile');

        if (token && refreshToken && userStr) {
          const user = JSON.parse(userStr);
          store.dispatch(setCredentials({ user, token, refreshToken, rememberMe: true }));

          // Asynchronously fetch fresh profile from the backend
          const { apiClient } = require('../src/core/services/api.service');
          apiClient.get('/auth/me')
            .then(async (res: any) => {
              // Backend shape: { success, message, data: { user, permissions } }
              const freshUser = res.data?.data?.user;
              const freshPermissions = res.data?.data?.permissions;
              if (freshUser) {
                await SecureStore.setItemAsync('userProfile', JSON.stringify(freshUser));
                store.dispatch(setCredentials({ user: freshUser, token, refreshToken, rememberMe: true, permissions: freshPermissions }));
              }
            })
            .catch((err: any) => {
              console.log('Background user profile refresh failed:', err?.message);
            });
        } else {
          router.replace('/login');
        }
      } catch (e) {
        console.warn('Authentication bootstrapping failed:', e);
        router.replace('/login');
      }
    };

    Promise.all([bootstrapAsync(), themeReady]).finally(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, []);

  return <NavigationGuard />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <PaperProvider>
              <AppThemeProvider>
                <StatusBar style="auto" />
                <Initializer />
              </AppThemeProvider>
            </PaperProvider>
          </QueryClientProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
