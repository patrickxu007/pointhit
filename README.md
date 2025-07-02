# PointHit - Tennis Match Tracker

A comprehensive React Native app for tracking tennis matches with AI-powered insights.

## Features

- **Match Tracking**: Track live tennis matches with detailed point-by-point scoring
- **AI Coach Insights**: Get personalized coaching feedback powered by AI
- **Text-to-Speech**: Listen to your AI insights with built-in TTS functionality
- **Statistics**: Comprehensive match statistics and analytics
- **Player Profiles**: Manage player information with photos
- **Match History**: View and analyze past matches

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Hono.js with tRPC
- **State Management**: Zustand
- **AI**: Rork Toolkit LLM API (GPT-based)
- **TTS**: Expo Speech
- **Icons**: Lucide React Native

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pointhit-tennis-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```
   
   Set the following variables:
   ```
   EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Start the backend server**
   The backend runs on Hono.js and needs to be accessible for AI insights to work.

## AI Coach Insights

The app uses the Rork Toolkit LLM API for generating personalized tennis coaching insights. The AI analyzes:

- Match statistics (serves, winners, errors)
- Point-by-point performance
- Set-by-set breakdown
- Shot type analysis

### LLM Information
- **Primary**: Rork Toolkit LLM API (GPT-based model)
- **Fallback**: Rule-based analysis when AI is unavailable
- **Features**: Personalized coaching feedback, training recommendations

## Text-to-Speech

The app includes comprehensive TTS functionality:
- Listen to full insights
- Play individual sections
- Pause/resume/stop controls
- Mobile-only feature (not available on web)

## Troubleshooting

### Network Request Failed Error

If you encounter "Network request failed" when generating AI insights:

1. **Check Backend Connection**
   - Ensure your backend server is running
   - Verify the `EXPO_PUBLIC_RORK_API_BASE_URL` environment variable
   - Try accessing `http://localhost:3000/api` in your browser

2. **Environment Variables**
   - Make sure `.env` file exists with correct values
   - Restart the Expo development server after changing environment variables

3. **Network Issues**
   - Check your internet connection
   - Verify firewall settings aren't blocking the connection
   - Try using a different network

4. **Development URLs**
   The app will try these fallback URLs in development:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
   - `http://192.168.1.100:3000`

### TTS Not Working

- TTS is only available on mobile devices (iOS/Android)
- Web version will show a message that TTS is not available
- Ensure device volume is turned up
- Check device TTS settings

## Development

### File Structure

```
app/                    # Expo Router pages
├── (tabs)/            # Tab navigation
├── match/[id]/        # Match detail pages
└── ...

components/            # Reusable components
├── charts/           # Chart components
└── ...

backend/              # Backend API
├── trpc/            # tRPC routes
└── ...

store/               # Zustand stores
types/               # TypeScript types
constants/           # App constants
```

### Key Components

- **PointTracker**: Handles point-by-point match tracking
- **AI Insights**: Generates and displays coaching feedback
- **TTS Controls**: Text-to-speech functionality
- **Match Statistics**: Comprehensive analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license information here]