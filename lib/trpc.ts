import { createTRPCReact } from "@trpc/react-query";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { Platform } from "react-native";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  // For production builds, use the environment variable
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    console.log('Using configured API URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL);
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }
  
  // For development, use localhost
  if (__DEV__) {
    const devUrl = 'http://localhost:3000';
    console.log('Using development API URL:', devUrl);
    return devUrl;
  }
  
  // Fallback for production builds without environment variable
  const fallbackUrl = 'https://pointhit.com';
  console.log('Using fallback production API URL:', fallbackUrl);
  return fallbackUrl;
};

// Enhanced fetch function with better error handling for production
const enhancedFetch = async (input: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  try {
    // Longer timeout for production builds
    const timeoutMs = __DEV__ ? 5000 : 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    console.log('Making request to:', input);
    
    const response = await fetch(input, {
      ...options,
      signal: controller.signal,
      headers: {
        ...options?.headers,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': Platform.select({
          ios: 'PointHit-iOS/1.3.3',
          android: 'PointHit-Android/1.3.3',
          default: 'PointHit-App/1.3.3'
        }),
      },
    });

    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('HTTP Error:', response.status, response.statusText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('Network request failed:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your internet connection');
      }
      if (error.message.includes('Network request failed')) {
        throw new Error('Unable to connect to server - please check your internet connection');
      }
      if (error.message.includes('JSON Parse error')) {
        throw new Error('Server returned invalid response');
      }
    }
    
    throw error;
  }
};

// React client for use in components
export const trpcReactClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      fetch: enhancedFetch,
      headers: () => ({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Platform': Platform.OS,
        'X-Client-Version': '1.3.3',
      }),
    }),
  ],
});

// Vanilla client for use outside React components
export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      fetch: enhancedFetch,
      headers: () => ({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Platform': Platform.OS,
        'X-Client-Version': '1.3.3',
      }),
    }),
  ],
});