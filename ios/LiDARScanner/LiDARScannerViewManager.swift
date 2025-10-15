// ios/LiDARScanner/LiDARScannerViewManager.swift
// React Native view manager for LiDAR view

import Foundation
import UIKit
import SwiftUI

@objc(LiDARScannerViewManager)
class LiDARScannerViewManager: RCTViewManager {
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  override func view() -> UIView! {
    let hostingController = UIHostingController(rootView: LiDARScannerView())
    return hostingController.view
  }
}


