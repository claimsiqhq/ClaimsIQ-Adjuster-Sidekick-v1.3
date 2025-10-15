// ios/LiDARScanner/LiDARScannerView.swift
// ARView component for LiDAR visualization

import SwiftUI
import ARKit
import RealityKit

struct LiDARScannerView: UIViewRepresentable {
  var onScanUpdate: (([String: Any]) -> Void)?
  
  func makeUIView(context: Context) -> ARView {
    let arView = ARView(frame: .zero)
    
    let config = ARWorldTrackingConfiguration()
    config.sceneReconstruction = .mesh
    config.planeDetection = [.horizontal, .vertical]
    config.environmentTexturing = .automatic
    
    arView.session.run(config)
    arView.session.delegate = context.coordinator
    
    // Add coaching overlay
    let coachingOverlay = ARCoachingOverlayView()
    coachingOverlay.session = arView.session
    coachingOverlay.goal = .horizontalPlane
    coachingOverlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    arView.addSubview(coachingOverlay)
    
    return arView
  }
  
  func updateUIView(_ uiView: ARView, context: Context) {
    // Update if needed
  }
  
  func makeCoordinator() -> Coordinator {
    Coordinator(self)
  }
  
  class Coordinator: NSObject, ARSessionDelegate {
    var parent: LiDARScannerView
    
    init(_ parent: LiDARScannerView) {
      self.parent = parent
    }
    
    func session(_ session: ARSession, didUpdate frame: ARFrame) {
      var vertexCount = 0
      var meshCount = 0
      
      for anchor in frame.anchors {
        if let meshAnchor = anchor as? ARMeshAnchor {
          vertexCount += meshAnchor.geometry.vertices.count
          meshCount += 1
        }
      }
      
      let stats: [String: Any] = [
        "pointCount": vertexCount,
        "meshCount": meshCount,
        "timestamp": Date().timeIntervalSince1970
      ]
      
      parent.onScanUpdate?(stats)
    }
  }
}


