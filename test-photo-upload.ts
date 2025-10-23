// Test script for photo upload and annotation
import { supabase } from './utils/supabase';
import * as FileSystem from 'expo-file-system';
import { uploadPhotoToStorage, insertMediaRow, triggerAnnotation } from './services/media';
import { signIn } from './services/auth';

async function testPhotoUpload() {
  console.log('=== Photo Upload Test ===\n');
  
  try {
    // Step 1: Authenticate
    console.log('1. Authenticating...');
    const session = await signIn('john@claimsiq.ai', 'admin123');
    if (!session) {
      throw new Error('Failed to authenticate');
    }
    console.log('✅ Authenticated as:', session.user.email);
    console.log('   User ID:', session.user.id);
    
    // Step 2: Create a test image (base64 encoded 1x1 red pixel)
    console.log('\n2. Creating test image...');
    const testImageBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';
    
    // Save test image to file system
    const testImageUri = FileSystem.documentDirectory + 'test-damage-photo.jpg';
    await FileSystem.writeAsStringAsync(testImageUri, testImageBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log('✅ Test image created at:', testImageUri);
    
    // Step 3: Upload to storage
    console.log('\n3. Uploading to Supabase storage...');
    const timestamp = Date.now();
    const storagePath = `photos/test_${timestamp}.jpg`;
    
    const uploadedPath = await uploadPhotoToStorage(testImageUri, storagePath);
    console.log('✅ Uploaded to storage:', uploadedPath);
    
    // Step 4: Create media record
    console.log('\n4. Creating media record...');
    const mediaRecord = await insertMediaRow({
      claim_id: 'test-claim-001',
      user_id: session.user.id,
      org_id: 'default-org',
      type: 'photo',
      status: 'pending',
      label: 'Test damage photo',
      storage_path: uploadedPath,
      local_uri: testImageUri,
      lat: 37.7749,
      lng: -122.4194,
      captured_at: new Date().toISOString(),
    });
    console.log('✅ Media record created:', mediaRecord.id);
    
    // Step 5: Get public URL
    console.log('\n5. Getting public URL...');
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(uploadedPath);
    console.log('✅ Public URL:', publicUrl);
    
    // Step 6: Trigger annotation
    console.log('\n6. Triggering AI annotation...');
    await triggerAnnotation(mediaRecord.id);
    console.log('✅ Annotation triggered for media ID:', mediaRecord.id);
    
    // Step 7: Check annotation status
    console.log('\n7. Checking annotation status...');
    const { data: annotatedMedia, error } = await supabase
      .from('media')
      .select('*')
      .eq('id', mediaRecord.id)
      .single();
    
    if (error) throw error;
    
    console.log('✅ Media status:', annotatedMedia.status);
    if (annotatedMedia.annotation_json) {
      console.log('   Annotations:', JSON.stringify(annotatedMedia.annotation_json, null, 2));
    }
    
    console.log('\n=== Test Complete ===');
    return mediaRecord;
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('   Details:', error);
    throw error;
  }
}

// Export for testing
export { testPhotoUpload };

// Run if called directly
if (require.main === module) {
  testPhotoUpload()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}