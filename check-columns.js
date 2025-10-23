const fetch = require('node-fetch');

const SUPABASE_URL = 'https://lyppkkpawalcchbgbkxg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xG1vNYVo-wpyHi4WzCdUGg_9XFL8Gxr';

async function checkColumns() {
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
  
  // Try to insert minimal data to see what columns exist
  console.log('Testing documents table columns...');
  
  // Try with just claim_id and user_id
  const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      claim_id: '750e8400-e29b-41d4-a716-761244113098',
      user_id: 'bd7b3229-c5a4-4cdb-ae91-a41bb572b54d',
    }),
  });
  
  const error = await testResponse.text();
  console.log('Insert test result:', error);
  
  // Get existing documents to see structure
  const getResponse = await fetch(`${SUPABASE_URL}/rest/v1/documents?select=*&limit=1`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_ANON_KEY,
    },
  });
  
  if (getResponse.ok) {
    const docs = await getResponse.json();
    if (docs.length > 0) {
      console.log('\nExisting document structure:');
      console.log(JSON.stringify(docs[0], null, 2));
    } else {
      console.log('\nNo documents in table. Columns unknown.');
    }
  }
}

checkColumns().catch(console.error);
