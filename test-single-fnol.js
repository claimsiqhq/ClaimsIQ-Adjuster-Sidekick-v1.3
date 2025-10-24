const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lyppkkpawalcchbgbkxg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cHBra3Bhd2FsY2NoYmdia3hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM3NzEyMSwiZXhwIjoyMDc1OTUzMTIxfQ.QBkICfT_jM_mGyRFhKo143ZkKi8_zrZuixPYVvJGcRs'
);

async function testSingleFNOL() {
  const documentId = 'dc60ccc7-0a82-470d-93ab-670ee9ff8305'; // FNOL 46 TX.pdf
  
  console.log(`Testing document: ${documentId}\n`);
  
  const { data, error } = await supabase.functions.invoke('fnol-extract', {
    body: { documentId }
  });
  
  console.log('Response data:', JSON.stringify(data, null, 2));
  console.log('Response error:', error);
  
  if (error) {
    console.log('\nError details:');
    console.log('  Message:', error.message);
    console.log('  Context:', error.context);
  }
}

testSingleFNOL().catch(console.error);

