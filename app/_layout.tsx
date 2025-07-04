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

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Add initialization delay to ensure all systems are ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // iOS-specific initialization to prevent TTS crashes
        if (Platform.OS === 'ios') {
          try {
            // Don't preload expo-speech during app initialization
            // This was causing TurboModule crashes on iOS
            // Instead, we'll initialize it lazily when needed
            console.log('iOS detected - TTS will be initialized when needed');
          } catch (error) {
            console.warn('iOS initialization warning:', error);
          }
        }
      } catch (e) {
        console.warn('Error during app initialization:', e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
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