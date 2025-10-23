#!/usr/bin/env node
// REAL test using your ACTUAL Supabase database

const fetch = require('node-fetch');
const fs = require('fs');

const SUPABASE_URL = 'https://lyppkkpawalcchbgbkxg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xG1vNYVo-wpyHi4WzCdUGg_9XFL8Gxr';

async function testSupabaseReal() {
  console.log('=== TESTING REAL SUPABASE DATABASE ===\n');
  
  try {
    // Step 1: Authenticate with your REAL Supabase
    console.log('1. Authenticating with Supabase...');
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
    
    console.log('✅ Authenticated as:', authData.user.email);
    const accessToken = authData.access_token;
    
    // Step 2: Check what tables exist in YOUR Supabase
    console.log('\n2. Checking Supabase tables...');
    const tablesResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    
    const availableEndpoints = await tablesResponse.text();
    console.log('Available endpoints:', availableEndpoints.slice(0, 200));
    
    // Step 3: Test claims table
    console.log('\n3. Testing claims table...');
    const claimsResponse = await fetch(`${SUPABASE_URL}/rest/v1/claims?select=*&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    
    if (claimsResponse.ok) {
      const claims = await claimsResponse.json();
      console.log('✅ Claims table exists. Records found:', claims.length);
      if (claims.length > 0) {
        console.log('   Sample claim:', claims[0]);
      }
    } else {
      const error = await claimsResponse.text();
      console.log('❌ Claims table error:', error);
    }
    
    // Step 4: Test media table
    console.log('\n4. Testing media table...');
    const mediaResponse = await fetch(`${SUPABASE_URL}/rest/v1/media?select=*&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    
    if (mediaResponse.ok) {
      const media = await mediaResponse.json();
      console.log('✅ Media table exists. Records found:', media.length);
    } else {
      const error = await mediaResponse.text();
      console.log('❌ Media table error:', error);
    }
    
    // Step 5: Test documents table
    console.log('\n5. Testing documents table...');
    const docsResponse = await fetch(`${SUPABASE_URL}/rest/v1/documents?select=*&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    
    if (docsResponse.ok) {
      const docs = await docsResponse.json();
      console.log('✅ Documents table exists. Records found:', docs.length);
    } else {
      const error = await docsResponse.text();
      console.log('❌ Documents table error:', error);
    }
    
    // Step 6: Test inspection_steps table
    console.log('\n6. Testing inspection_steps table...');
    const stepsResponse = await fetch(`${SUPABASE_URL}/rest/v1/inspection_steps?select=*&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    
    if (stepsResponse.ok) {
      const steps = await stepsResponse.json();
      console.log('✅ Inspection_steps table exists. Records found:', steps.length);
    } else {
      const error = await stepsResponse.text();
      console.log('❌ Inspection_steps table error:', error);
    }
    
    // Step 7: Test storage buckets
    console.log('\n7. Testing storage buckets...');
    const bucketsResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    
    if (bucketsResponse.ok) {
      const buckets = await bucketsResponse.json();
      console.log('✅ Storage buckets:');
      buckets.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      });
    }
    
    console.log('\n=== SUPABASE DATABASE STATUS ===');
    console.log('This is your REAL production Supabase database.');
    console.log('URL:', SUPABASE_URL);
    console.log('\nNext step: Run the schema from database-schema.sql in your Supabase SQL Editor');
    console.log('to create any missing tables.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run the test
testSupabaseReal()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));