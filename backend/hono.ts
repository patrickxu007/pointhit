import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

// app will be mounted at /api
const app = new Hono();

// Enhanced CORS configuration for production
app.use("*", cors({
  origin: (origin) => {
    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      return origin || "*";
    }
    
    // In production, allow specific origins
    const allowedOrigins = [
      "https://pointhit.com",
      "https://api.pointhit.com",
      "https://app.pointhit.com",
      // Add your production domains here
    ];
    
    // Allow mobile app requests (they don't send origin header)
    if (!origin) {
      return true;
    }
    
    return allowedOrigins.includes(origin) ? origin : false;
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: [
    "Content-Type", 
    "Authorization", 
    "Accept",
    "X-Client-Platform",
    "X-Client-Version",
    "User-Agent"
  ],
  credentials: false,
  maxAge: 86400, // 24 hours
}));

// Add request logging middleware with better production logging
app.use("*", async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const url = c.req.url;
  const userAgent = c.req.header('User-Agent') || 'Unknown';
  const clientPlatform = c.req.header('X-Client-Platform') || 'Unknown';
  
  console.log(`[${new Date().toISOString()}] ${method} ${url} - Platform: ${clientPlatform} - UA: ${userAgent}`);
  
  await next();
  
  const duration = Date.now() - start;
  console.log(`[${new Date().toISOString()}] ${method} ${url} - ${c.res.status} - ${duration}ms`);
});

// Global error handler with enhanced error information
app.onError((err, c) => {
  console.error(`[${new Date().toISOString()}] Server error:`, {
    message: err.message,
    stack: err.stack,
    url: c.req.url,
    method: c.req.method,
    headers: Object.fromEntries(c.req.raw.headers.entries()),
  });
  
  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  return c.json({ 
    error: isProduction ? 'Internal server error' : err.message,
    message: isProduction ? 'Something went wrong. Please try again.' : err.message,
    timestamp: new Date().toISOString(),
    success: false,
    ...(isProduction ? {} : { stack: err.stack }),
  }, 500);
});

// Mount tRPC router at /trpc with enhanced error handling
app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
    onError: ({ error, path, input }) => {
      console.error(`[${new Date().toISOString()}] tRPC Error on ${path}:`, {
        message: error.message,
        code: error.code,
        input: input,
        stack: error.stack,
      });
    },
    responseMeta: () => {
      return {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Powered-By': 'PointHit-API',
        },
      };
    },
  })
);

// Enhanced health check endpoint
app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    message: "PointHit API is running",
    timestamp: new Date().toISOString(),
    version: "1.3.3",
    environment: process.env.NODE_ENV || 'development',
    success: true,
  });
});

// Health check for tRPC specifically
app.get("/trpc", (c) => {
  return c.json({ 
    status: "ok", 
    message: "tRPC endpoint is available",
    timestamp: new Date().toISOString(),
    endpoint: "/api/trpc",
    success: true,
  });
});

// API status endpoint for debugging
app.get("/status", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: "1.3.3",
    endpoints: {
      health: "/api",
      trpc: "/api/trpc",
      status: "/api/status"
    },
    success: true,
  });
});

// Catch-all route to return JSON instead of HTML
app.all("*", (c) => {
  console.log(`[${new Date().toISOString()}] 404 - ${c.req.method} ${c.req.path}`);
  
  return c.json({ 
    error: "Not found", 
    path: c.req.path,
    method: c.req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: ["/api", "/api/trpc", "/api/status"],
    success: false,
  }, 404);
});

export default app;