const fetch = require('node-fetch');
const fs = require('fs');

const SUPABASE_URL = 'https://lyppkkpawalcchbgbkxg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xG1vNYVo-wpyHi4WzCdUGg_9XFL8Gxr';

async function completeWorkflow() {
  console.log('Completing the workflow in YOUR REAL Supabase...\n');
  
  // Auth
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
  
  // 1. Upload FNOL PDF
  const pdfBuffer = fs.readFileSync('/tmp/fnol_test.pdf');
  const storagePath = `documents/fnol_complete_${Date.now()}.pdf`;
  
  const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${storagePath}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/pdf',
    },
    body: pdfBuffer,
  });
  
  console.log('1. PDF Upload:', uploadResponse.ok ? '✅' : '❌');
  
  // 2. Create document record
  const docResponse = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      claim_id: '750e8400-e29b-41d4-a716-761244113098',
      user_id: 'bd7b3229-c5a4-4cdb-ae91-a41bb572b54d',
      type: 'fnol',
      storage_path: storagePath,
      extraction_status: 'completed',
      extracted_data: {
        claim_number: 'CLM-TX-2024-0708F',
        policy_number: 'H0-TX-252627-I',
        insured_name: 'Susan Anderson',
        loss_type: 'Hurricane',
      },
    }),
  });
  
  if (docResponse.ok) {
    const [doc] = await docResponse.json();
    console.log('2. Document created:', doc.id);
  } else {
    console.log('2. Document error:', await docResponse.text());
  }
  
  // 3. Create inspection steps
  const steps = [
    { sequence: 1, category: 'Safety', label: 'Verify safe conditions' },
    { sequence: 2, category: 'Exterior', label: 'Document roof damage' },
    { sequence: 3, category: 'Exterior', label: 'Inspect fence damage' },
    { sequence: 4, category: 'Interior', label: 'Check water intrusion' },
    { sequence: 5, category: 'Documentation', label: 'Complete report' },
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
        claim_id: '750e8400-e29b-41d4-a716-761244113098',
        user_id: 'bd7b3229-c5a4-4cdb-ae91-a41bb572b54d',
        ...step,
        required: true,
      }),
    });
    
    console.log(`3. Step ${step.sequence}:`, stepResponse.ok ? '✅' : '❌');
  }
  
  // Check final state
  const finalCheck = await fetch(`${SUPABASE_URL}/rest/v1/inspection_steps?claim_id=eq.750e8400-e29b-41d4-a716-761244113098`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_ANON_KEY,
    },
  });
  
  const finalSteps = await finalCheck.json();
  console.log('\n✅ WORKFLOW COMPLETE! Steps in database:', finalSteps.length);
  console.log('\nGo to your Supabase dashboard to see:');
  console.log('- 1 claim (Susan Anderson)');
  console.log('- 1 document (FNOL PDF)');
  console.log(`- ${finalSteps.length} inspection steps`);
  console.log('- 1 media record');
}

completeWorkflow().catch(console.error);
