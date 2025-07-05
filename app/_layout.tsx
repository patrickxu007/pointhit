import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import Colors from "@/constants/colors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcReactClient } from "@/lib/trpc";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a client with optimized settings for mobile and production builds
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry during initialization to prevent QR code scanning issues
        if (!__DEV__) {
          return failureCount < 2; // Retry once in production
        }
        return false; // No retries in development
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      networkMode: 'offlineFirst',
      // Enhanced error handling for production
      onError: (error) => {
        console.log('Query error:', error);
      },
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: (failureCount, error) => {
        // Retry mutations in production for better reliability
        if (!__DEV__) {
          return failureCount < 1; // Retry once in production
        }
        return false; // No retries in development
      },
      onError: (error) => {
        console.log('Mutation error:', error);
      },
    },
  },
});

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        console.log(`[${new Date().toISOString()}] Initializing PointHit app...`);
        console.log(`[${new Date().toISOString()}] Platform: ${Platform.OS}`);
        console.log(`[${new Date().toISOString()}] Environment: ${__DEV__ ? 'development' : 'production'}`);
        
        // Log environment variables for debugging (only in development)
        if (__DEV__) {
          console.log(`[${new Date().toISOString()}] API Base URL:`, process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'not set');
        }
        
        // Minimal initialization to prevent QR code scanning issues
        // Just mark as ready immediately
        setIsReady(true);
        console.log(`[${new Date().toISOString()}] App initialization completed successfully`);
      } catch (e) {
        console.warn(`[${new Date().toISOString()}] Error during app initialization:`, e);
        setInitError(e instanceof Error ? e.message : 'Unknown initialization error');
        // Even if there's an error, mark as ready to prevent QR code scanning issues
        setIsReady(true);
      } finally {
        // Hide splash screen after minimal delay
        setTimeout(() => {
          SplashScreen.hideAsync().catch((error) => {
            console.warn(`[${new Date().toISOString()}] Error hiding splash screen:`, error);
          });
        }, 100);
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: Colors.background 
      }}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ 
          marginTop: 16, 
          color: Colors.text,
          fontSize: 16,
          fontWeight: '500'
        }}>
          Loading PointHit...
        </Text>
        {__DEV__ && initError && (
          <Text style={{
            marginTop: 8,
            color: Colors.error,
            fontSize: 12,
            textAlign: 'center',
            paddingHorizontal: 20,
          }}>
            Debug: {initError}
          </Text>
        )}
      </View>
    );
  }

  return (
    <trpc.Provider client={trpcReactClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerBackTitle: "Back",
            headerStyle: {
              backgroundColor: Colors.background,
            },
            headerTintColor: Colors.primary,
            headerTitleStyle: {
              fontWeight: '600',
            },
            contentStyle: {
              backgroundColor: Colors.background,
            },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="new-match" 
            options={{ 
              title: "New Match",
              presentation: "modal",
            }} 
          />
          <Stack.Screen 
            name="match/[id]" 
            options={{ 
              title: "Match Details",
            }} 
          />
          <Stack.Screen 
            name="match/[id]/track" 
            options={{ 
              title: "Track Match",
            }} 
          />
          <Stack.Screen 
            name="match/[id]/insights" 
            options={{ 
              title: "AI Coach Insights",
            }} 
          />
        </Stack>
      </QueryClientProvider>
    </trpc.Provider>
  );
}