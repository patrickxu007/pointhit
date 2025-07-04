# PointHit - Troubleshooting Guide

## QR Code Scanning Issues

If the app gets stuck at "Opening project" when scanning the QR code, try these steps:

### 1. Check Network Connection
- Ensure your phone and development machine are on the same WiFi network
- Disable VPN if you're using one
- Check if your firewall is blocking port 3000

### 2. Environment Setup
Make sure you have a `.env` file in the root directory with:
```
EXPO_PUBLIC_RORK_API_BASE_URL=http://YOUR_LOCAL_IP:3000
```

To find your local IP:
- **macOS/Linux**: Run `ifconfig | grep inet` or `ip addr show`
- **Windows**: Run `ipconfig`
- Look for your WiFi adapter's IP address (usually starts with 192.168.x.x)

### 3. Start the Development Server
```bash
# Start the Expo development server
npm start

# Or with tunnel (if local network doesn't work)
npm run start:tunnel
```

### 4. Backend Server
Make sure your backend server is running:
```bash
# The backend should be accessible at http://localhost:3000/api
# Test it by visiting http://localhost:3000/api in your browser
```

### 5. Clear Cache
If issues persist:
```bash
# Clear Expo cache
npx expo start --clear

# Clear npm cache
npm cache clean --force

# Clear React Native cache
npx react-native start --reset-cache
```

### 6. Alternative Connection Methods

If QR code scanning doesn't work:

1. **Use Tunnel Mode**:
   ```bash
   npm run start:tunnel
   ```

2. **Manual Connection**:
   - Note the IP address shown in the Expo CLI
   - In Expo Go app, tap "Enter URL manually"
   - Enter: `exp://YOUR_IP:8081`

3. **Development Build**:
   ```bash
   npm run start:dev
   ```

### 7. Common Error Messages

**"Network request failed"**
- Check if backend server is running
- Verify the API URL in `.env` file
- Try using tunnel mode

**"Unable to connect to server"**
- Backend server might not be running
- Check firewall settings
- Try different network

**"Request timeout"**
- Network is too slow
- Try tunnel mode
- Check internet connection

### 8. Debug Information

The app logs network status and connection attempts. Check the console for:
- API base URL being used
- Network connectivity status
- TRPC request/response logs

### 9. Reset Everything

If nothing works:
```bash
# Stop all processes
# Delete node_modules
rm -rf node_modules

# Reinstall dependencies
npm install

# Clear all caches
npx expo start --clear

# Start fresh
npm start
```

## iOS TestFlight Crashes

If the app crashes immediately on iOS TestFlight:

1. **Check Crash Logs**: The crashes are related to TextToSpeech/TTS initialization
2. **Disable TTS Features**: The app has been configured to lazy-load TTS to prevent crashes
3. **Update iOS**: Ensure you're running the latest iOS version
4. **Reinstall**: Delete and reinstall the app from TestFlight

## Need Help?

If you're still experiencing issues:
1. Check the console logs for error messages
2. Try the network status indicator in the app
3. Verify all environment variables are set correctly
4. Ensure both your phone and computer are on the same network