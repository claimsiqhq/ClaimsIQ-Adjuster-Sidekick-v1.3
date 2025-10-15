// ios/LiDARScanner/LiDARScanner.swift
// LiDAR scanning module with DIMENSIONS

import Foundation
import ARKit
import RealityKit

@objc(LiDARScanner)
class LiDARScanner: RCTEventEmitter {
  
  private var arSession: ARSession?
  private var isScanning = false
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  override func supportedEvents() -> [String]! {
    return ["onScanProgress", "onScanComplete", "onScanError"]
  }
  
  @objc
  func isLiDARAvailable(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let available = ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh)
    resolve(available)
  }
  
  @objc
  func startScanning(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) else {
        reject("NO_LIDAR", "Device does not support LiDAR", nil)
        return
      }
      
      let configuration = ARWorldTrackingConfiguration()
      configuration.sceneReconstruction = .mesh
      configuration.planeDetection = [.horizontal, .vertical]
      configuration.environmentTexturing = .automatic
      
      if self.arSession == nil {
        self.arSession = ARSession()
      }
      
      self.arSession?.run(configuration, options: [.resetTracking, .removeExistingAnchors])
      self.isScanning = true
      
      resolve(["success": true])
    }
  }
  
  @objc
  func stopScanning(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let session = self.arSession, self.isScanning else {
        reject("NOT_SCANNING", "No active scanning session", nil)
        return
      }
      
      session.pause()
      self.isScanning = false
      
      guard let frame = session.currentFrame else {
        reject("NO_FRAME", "Could not get current frame", nil)
        return
      }
      
      let meshAnchors = frame.anchors.compactMap { $0 as? ARMeshAnchor }
      
      // Calculate bounding box for dimensions
      var minVec = SIMD3<Float>(.greatestFiniteMagnitude, .greatestFiniteMagnitude, .greatestFiniteMagnitude)
      var maxVec = SIMD3<Float>(-.greatestFiniteMagnitude, -.greatestFiniteMagnitude, -.greatestFiniteMagnitude)
      
      for anchor in meshAnchors {
        let vertices = anchor.geometry.vertices.asSIMD3(transform: anchor.transform)
        for vertex in vertices {
          minVec = min(minVec, vertex)
          maxVec = max(maxVec, vertex)
        }
      }
      
      let dimensions = maxVec - minVec
      
      // Generate PLY file
      let fileName = "scan-\(Date().timeIntervalSince1970).ply"
      let filePath = self.generatePLY(from: meshAnchors, fileName: fileName)
      
      let result: [String: Any] = [
        "pointCount": meshAnchors.reduce(0) { $0 + $1.geometry.vertices.count },
        "meshCount": meshAnchors.count,
        "filePath": filePath ?? "",
        "dimensions": [
          "width": dimensions.x,
          "height": dimensions.y,
          "depth": dimensions.z
        ]
      ]
      
      resolve(result)
    }
  }
  
  @objc
  func getScanStats(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let session = self.arSession, let frame = session.currentFrame else {
        resolve(["isScanning": false, "pointCount": 0, "meshCount": 0])
        return
      }
      
      let meshAnchors = frame.anchors.compactMap { $0 as? ARMeshAnchor }
      let pointCount = meshAnchors.reduce(0) { $0 + $1.geometry.vertices.count }
      
      resolve([
        "isScanning": self.isScanning,
        "pointCount": pointCount,
        "meshCount": meshAnchors.count
      ])
    }
  }
  
  private func generatePLY(from meshAnchors: [ARMeshAnchor], fileName: String) -> String? {
    var vertices: [SIMD3<Float>] = []
    var faces: [[Int]] = []
    
    for anchor in meshAnchors {
      let geometry = anchor.geometry
      let transform = anchor.transform
      let baseIndex = vertices.count
      
      let anchorVertices = geometry.vertices.asSIMD3(transform: transform)
      vertices.append(contentsOf: anchorVertices)
      
      let indices = geometry.faces
      for i in stride(from: 0, to: indices.count, by: 3) {
        let face = [
          Int(indices[i]) + baseIndex,
          Int(indices[i + 1]) + baseIndex,
          Int(indices[i + 2]) + baseIndex
        ]
        faces.append(face)
      }
    }
    
    var plyString = """
    ply
    format ascii 1.0
    element vertex \(vertices.count)
    property float x
    property float y
    property float z
    element face \(faces.count)
    property list uchar int vertex_indices
    end_header
    
    """
    
    for vertex in vertices {
      plyString += "\(vertex.x) \(vertex.y) \(vertex.z)\n"
    }
    
    for face in faces {
      plyString += "3 \(face[0]) \(face[1]) \(face[2])\n"
    }
    
    guard let data = plyString.data(using: .utf8) else { return nil }
    
    let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    let fileURL = documentsPath.appendingPathComponent(fileName)
    
    try? data.write(to: fileURL)
    return fileURL.path
  }
}

// Helper extension for vertex transformation
extension ARGeometrySource {
  func asSIMD3(transform: simd_float4x4) -> [SIMD3<Float>] {
    var vertices = [SIMD3<Float>]()
    for i in 0..<self.count {
      let vertexPointer = self.buffer.contents().advanced(by: self.offset + self.stride * i)
      let vertex = vertexPointer.assumingMemoryBound(to: SIMD3<Float>.self).pointee
      
      var world_vertex = transform * SIMD4<Float>(vertex.x, vertex.y, vertex.z, 1)
      world_vertex /= world_vertex.w
      
      vertices.append(SIMD3<Float>(world_vertex.x, world_vertex.y, world_vertex.z))
    }
    return vertices
  }
}
