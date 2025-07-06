# PointHit tRPC Backend Deployment Guide

Your PointHit app uses tRPC for AI insights generation. Here's how to deploy the backend service:

## Option 1: Vercel (Recommended - Free tier available)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```
   - Follow the prompts
   - Choose your project name (e.g., "pointhit-backend")
   - Your backend will be available at: `https://your-project.vercel.app`

3. **Update your app configuration:**
   - Set `EXPO_PUBLIC_RORK_API_BASE_URL=https://your-project.vercel.app` in your `.env` file
   - Your tRPC endpoint will be: `https://your-project.vercel.app/api/trpc`

## Option 2: Railway (Free tier available)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and deploy:**
   ```bash
   railway login
   railway init
   railway up
   ```

3. **Get your deployment URL:**
   ```bash
   railway domain
   ```

## Option 3: Render (Free tier available)

1. **Connect your GitHub repo to Render**
2. **Create a new Web Service**
3. **Use these settings:**
   - Build Command: `npm install`
   - Start Command: `npm run start:backend`
   - Environment: `NODE_ENV=production`

## Option 4: Self-hosted (VPS/Cloud)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build and start:**
   ```bash
   npm run start:backend
   ```

## Environment Variables

After deployment, update your mobile app's environment:

1. **Create/update `.env` file:**
   ```
   EXPO_PUBLIC_RORK_API_BASE_URL=https://your-deployed-backend-url.com
   ```

2. **For production builds, set in EAS:**
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_RORK_API_BASE_URL --value https://your-deployed-backend-url.com
   ```

## Testing Your Deployment

1. **Health check:**
   ```
   GET https://your-deployed-url.com/api
   ```

2. **tRPC endpoint:**
   ```
   GET https://your-deployed-url.com/api/trpc
   ```

3. **Test AI insights generation from your mobile app**

## Troubleshooting

- **CORS issues:** The backend is configured for production CORS
- **Timeout issues:** Increase timeout in your deployment platform settings
- **Environment variables:** Make sure `NODE_ENV=production` is set

Your tRPC backend handles:
- AI insights generation
- Match data processing  
- Fallback analysis when AI service is unavailable