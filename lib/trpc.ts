import { createTRPCReact } from "@trpc/react-query";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  // For development, use a safe fallback that won't block app initialization
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }
  
  // Safe fallback for development - don't throw errors during QR code scanning
  const fallbackUrl = 'http://localhost:3000';
  console.log('Using fallback API URL:', fallbackUrl);
  
  return fallbackUrl;
};

// Simplified fetch function that won't block app initialization
const enhancedFetch = async (input: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  try {
    // Much shorter timeout to prevent QR code scanning issues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(input, {
      ...options,
      signal: controller.signal,
      headers: {
        ...options?.headers,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    // Don't log verbose errors during QR code scanning - just fail silently
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
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