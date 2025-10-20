// plugins/withLiDAR.js
// Expo config plugin for LiDAR support

const { withXcodeProject, withInfoPlist } = require('@expo/config-plugins');

function withLiDAR(config) {
  // Add frameworks
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    
    xcodeProject.addFramework('ARKit.framework', { weak: true });
    xcodeProject.addFramework('RealityKit.framework', { weak: true });
    xcodeProject.addFramework('SceneKit.framework', { weak: true });
    
    // Set bridging header
    const buildSettings = xcodeProject.pbxXCBuildConfigurationSection();
    Object.keys(buildSettings).forEach(key => {
      if (typeof buildSettings[key] === 'object' && buildSettings[key].buildSettings) {
        buildSettings[key].buildSettings.SWIFT_OBJC_BRIDGING_HEADER = 
          '$(SRCROOT)/LiDARScanner-Bridging-Header.h';
        buildSettings[key].buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '15.0';
      }
    });
    
    return config;
  });
  
  // Update Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.NSCameraUsageDescription = 
      'Used to capture photos and perform LiDAR 3D scanning for claims documentation.';
    
    // Make ARKit optional rather than required to support all iPhones
    // Remove the UIRequiredDeviceCapabilities for ARKit to prevent crashes on non-LiDAR devices
    
    return config;
  });
  
  return config;
}

module.exports = withLiDAR;

