# LiDAR Xcode Project Setup Instructions

## Manual Steps Required

Since Xcode project files are binary/complex, you need to manually add the LiDAR files to your Xcode project:

### 1. Open Xcode Project
```bash
open ios/ClaimsiQSidekick.xcworkspace
```

### 2. Add LiDAR Files to Project

1. **Right-click on `ClaimsiQSidekick` folder** in Project Navigator
2. Select **"Add Files to ClaimsiQSidekick..."**
3. Navigate to `ios/LiDARScanner/` directory
4. Select all 5 files:
   - `LiDARScanner.swift`
   - `LiDARScanner.m`
   - `LiDARScannerView.swift`
   - `LiDARScannerViewManager.swift`
   - `LiDARScannerViewManager.m`
5. **Check:** ✓ "Copy items if needed"
6. **Check:** ✓ "Create groups"
7. **Target:** ✓ ClaimsiQSidekick
8. Click **"Add"**

### 3. Configure Bridging Header

1. Click on **ClaimsiQSidekick** project (top of navigator)
2. Select **ClaimsiQSidekick** target
3. Go to **Build Settings** tab
4. Search for: **"Objective-C Bridging Header"**
5. Set value to: `ClaimsiQSidekick/LiDARScanner-Bridging-Header.h`

### 4. Add Required Frameworks

1. Select **ClaimsiQSidekick** target
2. Go to **General** tab
3. Scroll to **"Frameworks, Libraries, and Embedded Content"**
4. Click **"+"** button
5. Add these frameworks:
   - `ARKit.framework`
   - `RealityKit.framework`
   - `SceneKit.framework`

### 5. Update Info.plist

Add camera usage description (should already exist but verify):

```xml
<key>NSCameraUsageDescription</key>
<string>Used to capture photos and perform LiDAR 3D scanning for claims documentation.</string>
```

### 6. Set Deployment Target

1. Select project
2. Go to **Build Settings**
3. Search for **"iOS Deployment Target"**
4. Set to: **iOS 15.0** or higher (LiDAR requires iOS 14+, but iOS 15+ recommended)

### 7. Build and Test

1. Select your device (must be iPhone with LiDAR: 12 Pro, 13 Pro, 14 Pro, 15 Pro, or iPad Pro)
2. Click **Product → Build** (⌘B)
3. Verify no build errors

---

## Alternative: Automated via Expo Config Plugin

Create `plugins/withLiDAR.js`:

```javascript
const { withXcodeProject } = require('@expo/config-plugins');

module.exports = function withLiDAR(config) {
  return withXcodeProject(config, async (config) => {
    // Add ARKit and RealityKit frameworks
    const xcodeProject = config.modResults;
    
    xcodeProject.addFramework('ARKit.framework');
    xcodeProject.addFramework('RealityKit.framework');
    xcodeProject.addFramework('SceneKit.framework');
    
    return config;
  });
};
```

Then in `app.json`:
```json
{
  "plugins": [
    "./plugins/withLiDAR.js"
  ]
}
```

Then run: `npx expo prebuild --clean`

---

## Verification

After setup, test the module:

```javascript
import { lidarScanner } from '@/modules/lidar';

const available = await lidarScanner.isLiDARAvailable();
console.log('LiDAR available:', available);
```

Should return `true` on LiDAR-capable devices.

