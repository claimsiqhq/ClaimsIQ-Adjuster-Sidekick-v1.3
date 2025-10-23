#!/usr/bin/env node
// Test that works with your REAL Supabase schema

const fetch = require('node-fetch');
const fs = require('fs');

const SUPABASE_URL = 'https://lyppkkpawalcchbgbkxg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xG1vNYVo-wpyHi4WzCdUGg_9XFL8Gxr';

async function testRealSupabase() {
  console.log('=== TESTING WITH REAL SUPABASE SCHEMA ===\n');
  
  try {
    // Authenticate
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
    const accessToken = authData.access_token;
    const userId = authData.user.id;
    console.log('✅ Authenticated as:', authData.user.email);
    
    // 1. Create a NEW claim (with unique claim number)
    const timestamp = Date.now();
    const claimNumber = `TEST-${timestamp}`;
    const claimId = `c${timestamp.toString().slice(-11)}-0000-0000-0000-000000000000`;
    
    console.log('\n1. Creating claim:', claimNumber);
    const claimResponse = await fetch(`${SUPABASE_URL}/rest/v1/claims`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        id: claimId,
        user_id: userId,
        claim_number: claimNumber,
        status: 'open',
        insured_name: 'Test User',
        property_address: '123 Test St, Test City, TX 77777',
        loss_date: '2024-10-23T00:00:00+00:00',
        loss_type: 'Wind/Hail',
      }),
    });
    
    if (claimResponse.ok) {
      const [claim] = await claimResponse.json();
      console.log('✅ Claim created:', claim.id);
    } else {
      console.log('❌ Claim error:', await claimResponse.text());
    }
    
    // 2. Upload a test photo
    console.log('\n2. Uploading photo to media...');
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const imageBuffer = Buffer.from(testImage, 'base64');
    const photoPath = `media/${timestamp}_test.jpg`;
    
    const photoUpload = await fetch(`${SUPABASE_URL}/storage/v1/object/media/${photoPath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'image/jpeg',
      },
      body: imageBuffer,
    });
    
    if (photoUpload.ok) {
      console.log('✅ Photo uploaded:', photoPath);
      
      // Create media record with actual schema
      const mediaResponse = await fetch(`${SUPABASE_URL}/rest/v1/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          claim_id: claimId,
          user_id: userId,
          type: 'photo',
          status: 'pending',
          label: 'Test damage photo',
          storage_path: photoPath,
          anno_count: 0,
          qc: {
            lat: 29.3013,
            lng: -94.7977,
            captured_at: new Date().toISOString()
          }
        }),
      });
      
      if (mediaResponse.ok) {
        const [media] = await mediaResponse.json();
        console.log('✅ Media record created:', media.id);
      } else {
        console.log('❌ Media error:', await mediaResponse.text());
      }
    }
    
    // 3. Upload FNOL PDF
    console.log('\n3. Uploading FNOL PDF...');
    const pdfBuffer = fs.readFileSync('/tmp/fnol_test.pdf');
    const docPath = `documents/fnol_${timestamp}.pdf`;
    
    const docUpload = await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${docPath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/pdf',
      },
      body: pdfBuffer,
    });
    
    if (docUpload.ok) {
      console.log('✅ PDF uploaded:', docPath);
      
      // Create document record with CORRECT column names
      const docResponse = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          claim_id: claimId,
          user_id: userId,
          document_type: 'fnol', // Using correct column name!
          file_name: 'FNOL_Test.pdf',
          storage_path: docPath,
          mime_type: 'application/pdf',
          extraction_status: 'pending',
        }),
      });
      
      if (docResponse.ok) {
        const [doc] = await docResponse.json();
        console.log('✅ Document record created:', doc.id);
      } else {
        console.log('❌ Document error:', await docResponse.text());
      }
    }
    
    // 4. Create inspection steps
    console.log('\n4. Creating workflow steps...');
    const steps = [
      { sequence: 1, category: 'Safety', label: 'Verify safe conditions' },
      { sequence: 2, category: 'Exterior', label: 'Document damage' },
      { sequence: 3, category: 'Documentation', label: 'Complete report' },
    ];
    
    for (const step of steps) {
      const stepResponse = await fetch(`${SUPABASE_URL}/rest/v1/inspection_steps`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claim_id: claimId,
          user_id: userId,
          ...step,
          required: true,
          completed: false,
          evidence_count: 0,
        }),
      });
      
      console.log(`  Step ${step.sequence}:`, stepResponse.ok ? '✅' : '❌');
    }
    
    // 5. Verify everything
    console.log('\n5. Verifying data in Supabase...');
    
    const verifySteps = await fetch(`${SUPABASE_URL}/rest/v1/inspection_steps?claim_id=eq.${claimId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    
    const stepsData = await verifySteps.json();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ SUCCESS! Data created in YOUR Supabase:');
    console.log('='.repeat(50));
    console.log('• Claim:', claimNumber);
    console.log('• Media: 1 photo record');
    console.log('• Document: 1 FNOL PDF');
    console.log('• Workflow:', stepsData.length, 'inspection steps');
    console.log('\nCheck your Supabase dashboard to see this data!');
    console.log('URL: https://supabase.com/dashboard/project/lyppkkpawalcchbgbkxg');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testRealSupabase().catch(console.error);