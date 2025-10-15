# Dependencies to Install

Run these commands to add all required packages for the new features:

## Document Management
```bash
npm install expo-document-picker
npm install expo-sharing
npm install react-native-pdf
npm install expo-image-manipulator
```

## Offline Functionality
```bash
npm install @react-native-community/netinfo
npm install drizzle-orm
npm install --save-dev drizzle-kit
```

## Map & Location
```bash
npm install react-native-maps
npm install expo-location
```

## Performance & Error Tracking
```bash
npm install @sentry/react-native
```

## All at Once
```bash
npm install expo-document-picker expo-sharing react-native-pdf expo-image-manipulator @react-native-community/netinfo drizzle-orm react-native-maps expo-location @sentry/react-native && npm install --save-dev drizzle-kit
```

## After Installation

1. Run prebuild to generate native code:
   ```bash
   npx expo prebuild
   ```

2. For iOS, install pods:
   ```bash
   cd ios && pod install && cd ..
   ```

3. Update EAS build to include new dependencies:
   ```bash
   eas build --platform ios --profile preview
   ```

## Note on expo-sqlite

Already installed in package.json but not being used. The offline implementation uses it via:
- `expo-sqlite` for database
- `drizzle-orm` for ORM layer
- SQLite provides local persistence

