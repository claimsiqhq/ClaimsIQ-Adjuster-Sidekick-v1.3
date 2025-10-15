// ios/LiDARScanner/LiDARScannerView.swift
// ARView component for LiDAR visualization WITH VISIBLE MESH

import SwiftUI
import ARKit
import RealityKit

@objc(LiDARScannerView)
class LiDARScannerView: ARView {
  
  override init(frame: CGRect) {
    super.init(frame: frame)
    
    // Enable mesh visualization - THIS MAKES IT VISIBLE!
    self.debugOptions = [
      .showSceneUnderstanding,  // Shows the mesh in real-time
      .showWorldOrigin          // Shows coordinate system
    ]
    
    let config = ARWorldTrackingConfiguration()
    
    // Check LiDAR support
    if ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) {
      config.sceneReconstruction = .mesh
    }
    
    config.planeDetection = [.horizontal, .vertical]
    config.environmentTexturing = .automatic
    
    self.session.run(config)
  }
  
  required init?(coder decoder: NSCoder) {
    fatalError("init(coder:) not implemented")
  }
}
