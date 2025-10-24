const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lyppkkpawalcchbgbkxg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cHBra3Bhd2FsY2NoYmdia3hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM3NzEyMSwiZXhwIjoyMDc1OTUzMTIxfQ.QBkICfT_jM_mGyRFhKo143ZkKi8_zrZuixPYVvJGcRs'
);

async function checkConstraints() {
  // Test different status values
  const statusValues = ['pending', 'open', 'active', 'in_progress', 'closed', 'new'];
  
  console.log('Testing valid status values...\n');
  
  for (const status of statusValues) {
    const { error } = await supabase
      .from('claims')
      .insert({
        claim_number: `TEST-${status}-${Date.now()}`,
        status: status,
        user_id: 'bd7b3229-c5a4-4cdb-ae91-a41bb572b54d'
      })
      .select();
    
    if (error) {
      console.log(`❌ status='${status}': ${error.message}`);
    } else {
      console.log(`✅ status='${status}': VALID`);
      
      // Delete the test record
      await supabase
        .from('claims')
        .delete()
        .eq('claim_number', `TEST-${status}-${Date.now()}`);
    }
  }
  
  // Check existing claims for valid status values
  console.log('\nExisting claim status values:');
  const { data: claims } = await supabase
    .from('claims')
    .select('status')
    .not('status', 'is', null);
  
  if (claims) {
    const uniqueStatuses = [...new Set(claims.map(c => c.status))];
    console.log('Valid statuses in use:', uniqueStatuses);
  }
}

checkConstraints().catch(console.error);

