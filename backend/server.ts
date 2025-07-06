import { serve } from '@hono/node-server';
import app from './hono';

const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Starting PointHit tRPC server on port ${port}`);
console.log(`📡 tRPC endpoint will be available at: http://localhost:${port}/api/trpc`);
console.log(`🏥 Health check available at: http://localhost:${port}/api`);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`✅ PointHit tRPC server is running on http://localhost:${info.port}`);
  console.log(`🎾 Ready to serve AI tennis insights!`);
});