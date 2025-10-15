// plugins/withLiDAR.js
// Expo config plugin to automatically add LiDAR support during EAS build

const { withXcodeProject, withInfoPlist } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Add LiDAR Swift files to Xcode project automatically
 */
function withLiDAR(config) {
  // Add ARKit frameworks
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    
    // Add frameworks
    xcodeProject.addFramework('ARKit.framework', { weak: true });
    xcodeProject.addFramework('RealityKit.framework', { weak: true });
    xcodeProject.addFramework('SceneKit.framework', { weak: true });
    
    // Add LiDAR Swift files to project
    const lidarFiles = [
      'LiDARScanner/LiDARScanner.swift',
      'LiDARScanner/LiDARScanner.m',
      'LiDARScanner/LiDARScannerView.swift',
      'LiDARScanner/LiDARScannerViewManager.swift',
      'LiDARScanner/LiDARScannerViewManager.m',
    ];
    
    lidarFiles.forEach(file => {
      const filePath = path.join('LiDARScanner', path.basename(file));
      xcodeProject.addSourceFile(filePath, {}, 
        xcodeProject.findPBXGroupKey({ name: 'ClaimsiQSidekick' })
      );
    });
    
    // Set bridging header
    const buildSettings = xcodeProject.pbxXCBuildConfigurationSection();
    Object.keys(buildSettings).forEach(key => {
      if (typeof buildSettings[key] === 'object' && buildSettings[key].buildSettings) {
        buildSettings[key].buildSettings.SWIFT_OBJC_BRIDGING_HEADER = 
          '$(PROJECT_DIR)/ClaimsiQSidekick/LiDARScanner-Bridging-Header.h';
      }
    });
    
    return config;
  });
  
  // Update Info.plist for ARKit
  config = withInfoPlist(config, (config) => {
    config.modResults.NSCameraUsageDescription = 
      config.modResults.NSCameraUsageDescription || 
      'Used to capture photos and perform LiDAR 3D scanning for claims documentation.';
    
    // Add ARKit required device capability
    if (!config.modResults.UIRequiredDeviceCapabilities) {
      config.modResults.UIRequiredDeviceCapabilities = [];
    }
    if (!config.modResults.UIRequiredDeviceCapabilities.includes('arkit')) {
      config.modResults.UIRequiredDeviceCapabilities.push('arkit');
    }
    
    return config;
  });
  
  return config;
}

module.exports = withLiDAR;

