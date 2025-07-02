import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

// app will be mounted at /api
const app = new Hono();

// Enable CORS for all routes with more permissive settings
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: false,
}));

// Add request logging middleware
app.use("*", async (c, next) => {
  console.log(`${c.req.method} ${c.req.url}`);
  console.log('Headers:', c.req.header());
  await next();
});

// Global error handler to ensure JSON responses
app.onError((err, c) => {
  console.error('Server error:', err);
  console.error('Error stack:', err.stack);
  
  // Always return JSON, never HTML
  return c.json({ 
    error: 'Internal server error', 
    message: err.message,
    timestamp: new Date().toISOString(),
    success: false,
    path: c.req.path,
    method: c.req.method,
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
      console.error(`tRPC Error on ${path}:`, error);
      console.error('Input:', input);
      console.error('Error stack:', error.stack);
    },
    responseMeta: () => {
      return {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      };
    },
  })
);

// Simple health check endpoint
app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    message: "API is running",
    timestamp: new Date().toISOString(),
    success: true,
    version: "1.0.0",
  });
});

// Health check for tRPC specifically
app.get("/trpc", (c) => {
  return c.json({ 
    status: "ok", 
    message: "tRPC endpoint is available",
    timestamp: new Date().toISOString(),
    success: true,
    endpoint: "/api/trpc",
  });
});

// Catch-all route to return JSON instead of HTML
app.all("*", (c) => {
  console.log(`404 - Route not found: ${c.req.method} ${c.req.path}`);
  return c.json({ 
    error: "Not found", 
    path: c.req.path,
    method: c.req.method,
    timestamp: new Date().toISOString(),
    success: false,
    availableEndpoints: [
      "GET /api/",
      "GET /api/trpc",
      "POST /api/trpc/*",
    ],
  }, 404);
});

export default app;