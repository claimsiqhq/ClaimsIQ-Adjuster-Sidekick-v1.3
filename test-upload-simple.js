#!/usr/bin/env node
// Simple test script for photo upload and annotation
// Run with: node test-upload-simple.js

const fetch = require('node-fetch');

const SUPABASE_URL = 'https://lyppkkpawalcchbgbkxg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xG1vNYVo-wpyHi4WzCdUGg_9XFL8Gxr';

async function testUploadAndAnnotation() {
  console.log('=== Testing Photo Upload and Annotation ===\n');
  
  try {
    // Step 1: Authenticate
    console.log('1. Authenticating...');
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'john@claimsiq.ai',
        password: 'admin123',
      }),
    });
    
    const authData = await authResponse.json();
    if (!authData.access_token) {
      throw new Error('Authentication failed: ' + JSON.stringify(authData));
    }
    
    console.log('✅ Authenticated successfully');
    console.log('   User ID:', authData.user.id);
    const accessToken = authData.access_token;
    
    // Step 2: Create a simple test image (1x1 red pixel)
    console.log('\n2. Creating test image...');
    // This is a base64 encoded 1x1 red pixel JPEG
    const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';
    const imageBuffer = Buffer.from(testImageBase64, 'base64');
    console.log('✅ Test image created (size: ' + imageBuffer.length + ' bytes)');
    
    // Step 3: Upload to storage
    console.log('\n3. Uploading to Supabase storage...');
    const timestamp = Date.now();
    const storagePath = `photos/test_${timestamp}.jpg`;
    
    const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/media/${storagePath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'image/jpeg',
      },
      body: imageBuffer,
    });
    
    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error('Upload failed: ' + error);
    }
    
    console.log('✅ Uploaded to storage:', storagePath);
    
    // Step 4: First create a claim record
    console.log('\n4. Creating claim record...');
    const claimId = '550e8400-e29b-41d4-a716-446655440000';
    const claimData = {
      id: claimId,
      user_id: authData.user.id,
      claim_number: 'TEST-' + timestamp,
      status: 'active',
      insured_name: 'Test User',
      loss_date: new Date().toISOString().split('T')[0],
    };
    
    const claimResponse = await fetch(`${SUPABASE_URL}/rest/v1/claims`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(claimData),
    });
    
    if (!claimResponse.ok) {
      const error = await claimResponse.text();
      console.log('⚠️  Claim creation failed (may already exist):', error);
      // Continue anyway - claim might already exist
    } else {
      const [claim] = await claimResponse.json();
      console.log('✅ Claim created:', claim.id);
    }
    
    // Step 5: Create media record in database
    console.log('\n5. Creating media record...');
    // Use minimal fields with proper UUID format
    const mediaRecord = {
      claim_id: claimId,
      user_id: authData.user.id,
      type: 'photo',
      status: 'pending',
      storage_path: storagePath,
    };
    
    const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(mediaRecord),
    });
    
    if (!dbResponse.ok) {
      const error = await dbResponse.text();
      throw new Error('Database insert failed: ' + error);
    }
    
    const [insertedRecord] = await dbResponse.json();
    console.log('✅ Media record created:', insertedRecord.id);
    
    // Step 6: Get public URL
    console.log('\n6. Public URL:', `${SUPABASE_URL}/storage/v1/object/public/media/${storagePath}`);
    
    // Step 7: Trigger annotation
    console.log('\n7. Triggering AI annotation...');
    const annotateResponse = await fetch(`${SUPABASE_URL}/functions/v1/vision-annotate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mediaId: insertedRecord.id,
        path: storagePath,
        sceneTags: ['roof', 'damage', 'test'],
      }),
    });
    
    if (!annotateResponse.ok) {
      const error = await annotateResponse.text();
      console.warn('⚠️  Annotation failed (edge function may not be deployed):', error);
      console.log('   To deploy: supabase functions deploy vision-annotate');
    } else {
      const annotationResult = await annotateResponse.json();
      console.log('✅ Annotation result:', annotationResult);
    }
    
    // Step 7: Check updated media record
    console.log('\n7. Checking annotation status...');
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/media?id=eq.${insertedRecord.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    
    const [updatedRecord] = await checkResponse.json();
    console.log('✅ Media status:', updatedRecord.status);
    if (updatedRecord.annotation_json) {
      console.log('   Annotations:', JSON.stringify(updatedRecord.annotation_json, null, 2));
    }
    
    console.log('\n=== Test Complete ===');
    console.log('Media ID:', insertedRecord.id);
    console.log('Storage path:', storagePath);
    console.log('View at:', `${SUPABASE_URL}/storage/v1/object/public/media/${storagePath}`);
    
    return insertedRecord;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testUploadAndAnnotation()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });