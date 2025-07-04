import { createTRPCReact } from "@trpc/react-query";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  // For development, try multiple possible URLs
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }
  
  // Fallback URLs for development
  if (__DEV__) {
    // Try localhost first, then common development URLs
    const devUrls = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://192.168.1.100:3000', // Common local network IP
    ];
    
    console.warn(
      'EXPO_PUBLIC_RORK_API_BASE_URL not set. Using development fallback URLs.',
      'Please set EXPO_PUBLIC_RORK_API_BASE_URL in your environment variables.'
    );
    
    return devUrls[0]; // Use localhost as default
  }

  throw new Error(
    "No base url found. Please set EXPO_PUBLIC_RORK_API_BASE_URL environment variable."
  );
};

// Create a timeout function for React Native without generators
const createTimeoutPromise = (timeoutMs: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeoutMs);
  });
};

// Enhanced fetch function with better error handling and proper typing
const enhancedFetch = async (input: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  try {
    console.log('Making TRPC request to:', typeof input === 'string' ? input : input.toString());
    
    // Create timeout promise
    const timeoutPromise = createTimeoutPromise(45000); // 45 second timeout
    
    // Create fetch promise
    const fetchPromise = fetch(input, {
      ...options,
      headers: {
        ...options?.headers,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Race between fetch and timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    console.log('TRPC response status:', response.status);
    console.log('TRPC response headers:', Object.fromEntries(response.headers.entries()));

    // Check if response is HTML (error page) instead of JSON
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      console.error('Server returned non-JSON response:', contentType);
      const text = await response.text();
      console.error('Response body:', text.substring(0, 500));
      throw new Error(`Server returned ${contentType} instead of JSON. This usually indicates a server error.`);
    }

    // Log response for debugging
    if (!response.ok) {
      const errorText = await response.text();
      console.error('TRPC error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error('Enhanced fetch error:', error);
    if (error instanceof Error) {
      if (error.message === 'Request timeout') {
        throw new Error('Request timed out. Please check your internet connection and try again.');
      }
      if (error.message.includes('Network request failed')) {
        throw new Error('Network connection failed. Please check your internet connection.');
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to server. Please check if the server is running.');
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
      }),
    }),
  ],
});