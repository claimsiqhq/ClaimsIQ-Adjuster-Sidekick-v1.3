import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { uploadMedia } from '@/services/media';
import { useAuth } from '@/services/auth';
import { useClaimStore } from '@/store/useClaimStore'; // Import the new store
import { handleAppError } from '@/utils/errors';

export default function Capture() {
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { session } = useAuth();
  const { activeClaimId } = useClaimStore(); // Get the active claim ID from the store

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <Pressable onPress={requestPermission} style={styles.button}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  const takePicture = async () => {
    if (isProcessing) return;

    // Critical Check: Ensure a claim is selected before allowing a photo.
    if (!activeClaimId) {
        Alert.alert(
            "No Active Claim",
            "Please select a claim from the 'Claims' tab before taking photos."
        );
        return;
    }

    setIsProcessing(true);

    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });

        if (!photo || !photo.base64) {
            throw new Error("Failed to capture image or get base64 data.");
        }
        
        const uploadedMedia = await uploadMedia(photo.base64, activeClaimId, session!.user.id);
        
        if (!uploadedMedia) {
            throw new Error("Failed to upload media.");
        }
        
        Alert.alert(
            "Photo Uploaded",
            "The photo is being analyzed and will appear in the claim's gallery shortly."
        );

        // Navigate to the specific claim's gallery
        router.replace(`/claim/${activeClaimId}`);

      }
    } catch (error: any) {
      handleAppError(error, 'Failed to capture or process the photo.');
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back" />
      <View style={styles.overlay}>
        <Pressable style={styles.captureButton} onPress={takePicture} disabled={isProcessing}>
          {isProcessing ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
   button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
});