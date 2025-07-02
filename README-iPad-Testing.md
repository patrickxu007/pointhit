# Testing Tennis Tracker on iPad

## Option 1: Expo Go App (Recommended for Development)

1. **Install Expo Go** on your iPad from the App Store
2. **Start the development server** on your computer:
   ```bash
   npm start
   # or
   yarn start
   ```
3. **Scan the QR code** that appears in your terminal/browser with your iPad camera
4. The app will open in Expo Go

## Option 2: Web Version (Safari on iPad)

1. **Start the web development server**:
   ```bash
   npm run start-web
   # or
   yarn start-web
   ```
2. **Open Safari** on your iPad and navigate to the local URL (usually `http://localhost:19006`)
3. The app will run as a web app in Safari

## Option 3: Development Build (Advanced)

For a more native experience, you can create a development build:

1. Install EAS CLI: `npm install -g @expo/eas-cli`
2. Run: `eas build --profile development --platform ios`
3. Install the resulting .ipa file on your iPad

## iPad-Specific Considerations

### Screen Size Optimization
The app is designed to work on tablets, but you might notice:
- **Larger touch targets** work better on iPad
- **Landscape mode** provides more space for charts and statistics
- **Split-screen multitasking** is supported

### Features That Work Great on iPad
- ✅ **Larger charts** for better statistics viewing
- ✅ **More comfortable point tracking** with bigger buttons
- ✅ **Better PDF viewing** for match reports
- ✅ **Landscape orientation** for score tracking during matches

### Known Limitations on iPad
- 📷 **Camera features** (profile pictures) work but may need permission
- 📱 **Haptic feedback** is limited compared to iPhone
- 🔄 **Some animations** might perform differently

## Recommended Testing Approach

1. **Start with Expo Go** for quick testing and development
2. **Test in both orientations** (portrait and landscape)
3. **Try the web version** to see how it performs in Safari
4. **Test all major features**:
   - Creating players and matches
   - Point tracking during games
   - Statistics viewing
   - PDF generation and sharing

## Performance Tips for iPad

- The app should run smoothly on iPad Air 2 and newer
- For older iPads, the web version might perform better
- Charts and animations are optimized for 60fps on modern iPads

## Troubleshooting

**If Expo Go doesn't connect:**
- Make sure your iPad and computer are on the same WiFi network
- Try the tunnel option: `expo start --tunnel`

**If web version has issues:**
- Clear Safari cache and cookies
- Try in private browsing mode
- Check console for any errors

**For development builds:**
- You'll need an Apple Developer account
- The build process takes 10-15 minutes