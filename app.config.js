module.exports = {
  expo: {
    name: "PointHit",
    slug: "pointhit-tennis-tracker",
    version: "1.1",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: "PointHit needs access to your camera to take profile pictures for players.",
        NSPhotoLibraryUsageDescription: "PointHit needs access to your photo library to select profile pictures for players."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    web: {
      favicon: "./assets/images/favicon.png",
      bundler: "metro"
    },
    plugins: [
      "expo-router",
      [
        "expo-image-picker",
        {
          photosPermission: "PointHit needs access to your photo library to select profile pictures for players.",
          cameraPermission: "PointHit needs access to your camera to take profile pictures for players."
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    }
  }
};