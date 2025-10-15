// ios/LiDARScanner/LiDARScanner.swift
// LiDAR scanning module using ARKit for 3D room capture

import Foundation
import ARKit
import RealityKit

@objc(LiDARScanner)
class LiDARScanner: RCTEventEmitter {
  
  private var arSession: ARSession?
  private var arView: ARView?
  private var meshAnchors: [UUID: MeshAnchor] = [:]
  private var isScanning = false
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  override func supportedEvents() -> [String]! {
    return ["onScanProgress", "onScanComplete", "onScanError"]
  }
  
  // Check if device supports LiDAR
  @objc
  func isLiDARAvailable(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let available = ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh)
    resolve(available)
  }
  
  // Start LiDAR scanning session
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
  
  // Stop scanning and generate mesh
  @objc
  func stopScanning(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let session = self.arSession, self.isScanning else {
        reject("NOT_SCANNING", "No active scanning session", nil)
        return
      }
      
      session.pause()
      self.isScanning = false
      
      // Extract mesh data
      let meshData = self.extractMeshData(from: session)
      resolve(meshData)
    }
  }
  
  // Export mesh as PLY file
  @objc
  func exportMesh(_ fileName: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      guard let session = self.arSession else {
        reject("NO_SESSION", "No scanning session available", nil)
        return
      }
      
      do {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let fileURL = documentsPath.appendingPathComponent(fileName)
        
        // Generate PLY file
        let plyData = self.generatePLY(from: session)
        try plyData.write(to: fileURL)
        
        resolve(["filePath": fileURL.path, "fileSize": plyData.count])
      } catch {
        reject("EXPORT_FAILED", "Failed to export mesh: \(error.localizedDescription)", error)
      }
    }
  }
  
  // Get current scan statistics
  @objc
  func getScanStats(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let session = self.arSession else {
        resolve(["isScanning": false, "pointCount": 0, "meshCount": 0])
        return
      }
      
      let stats = self.calculateScanStats(from: session)
      resolve(stats)
    }
  }
  
  // MARK: - Private Methods
  
  private func extractMeshData(from session: ARSession) -> [String: Any] {
    guard let frame = session.currentFrame else {
      return ["pointCount": 0, "meshAnchors": 0]
    }
    
    var totalVertices = 0
    var meshCount = 0
    
    for anchor in frame.anchors {
      if let meshAnchor = anchor as? ARMeshAnchor {
        totalVertices += meshAnchor.geometry.vertices.count
        meshCount += 1
      }
    }
    
    return [
      "pointCount": totalVertices,
      "meshCount": meshCount,
      "timestamp": Date().timeIntervalSince1970
    ]
  }
  
  private func calculateScanStats(from session: ARSession) -> [String: Any] {
    let meshData = extractMeshData(from: session)
    return [
      "isScanning": isScanning,
      "pointCount": meshData["pointCount"] ?? 0,
      "meshCount": meshData["meshCount"] ?? 0
    ]
  }
  
  private func generatePLY(from session: ARSession) -> Data {
    guard let frame = session.currentFrame else {
      return Data()
    }
    
    var vertices: [simd_float3] = []
    var faces: [[Int]] = []
    
    // Collect all mesh data
    for anchor in frame.anchors {
      if let meshAnchor = anchor as? ARMeshAnchor {
        let geometry = meshAnchor.geometry
        let transform = meshAnchor.transform
        
        let baseIndex = vertices.count
        
        // Transform vertices to world coordinates
        for i in 0..<geometry.vertices.count {
          let vertex = geometry.vertices[i]
          let worldVertex = transform * simd_float4(vertex, 1.0)
          vertices.append(simd_float3(worldVertex.x, worldVertex.y, worldVertex.z))
        }
        
        // Add faces
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
    }
    
    // Generate PLY format
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
    
    // Write vertices
    for vertex in vertices {
      plyString += "\(vertex.x) \(vertex.y) \(vertex.z)\n"
    }
    
    // Write faces
    for face in faces {
      plyString += "3 \(face[0]) \(face[1]) \(face[2])\n"
    }
    
    return plyString.data(using: .utf8) ?? Data()
  }
}


