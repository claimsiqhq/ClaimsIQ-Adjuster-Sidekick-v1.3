module.exports = {
  expo: {
    name: "Claims iQ Sidekick",
    slug: "claimsiq-adjuster-sidekick-v13",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/app-icon.png",
    scheme: "claimsiq",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.claimsiq.claimsiqadjustersidekickv13",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: "Used to capture photos for claims documentation and AI annotations.",
        NSMicrophoneUsageDescription: "Used for voice notes and live assistant interactions.",
        NSPhotoLibraryAddUsageDescription: "Save exported reports and images to your library."
      }
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash.png",
          resizeMode: "contain",
          backgroundColor: "#F0E6FA"
        }
      ],
      "expo-sqlite",
      "./plugins/withLiDAR.js"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "31e9a2f0-7c90-41af-bdf1-f3e53d0e75dd"
      }
    },
    owner: "claimsiq"
  }
};