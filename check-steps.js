const fetch = require('node-fetch');

const SUPABASE_URL = 'https://lyppkkpawalcchbgbkxg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xG1vNYVo-wpyHi4WzCdUGg_9XFL8Gxr';

async function checkSteps() {
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
  
  // Try to insert minimal data to see what's required
  const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/inspection_steps`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      claim_id: '5fd8d760-6dc5-4a13-942f-a539da12f153',
      user_id: 'bd7b3229-c5a4-4cdb-ae91-a41bb572b54d',
      sequence: 99,
    }),
  });
  
  console.log('Error:', await testResponse.text());
}

checkSteps();
