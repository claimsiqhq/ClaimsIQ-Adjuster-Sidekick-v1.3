const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lyppkkpawalcchbgbkxg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cHBra3Bhd2FsY2NoYmdia3hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM3NzEyMSwiZXhwIjoyMDc1OTUzMTIxfQ.QBkICfT_jM_mGyRFhKo143ZkKi8_zrZuixPYVvJGcRs'
);

async function testSimpleFunction() {
  console.log('Testing simple function...\n');
  
  const { data, error } = await supabase.functions.invoke('fnol-extract-test', {
    body: { test: 'hello' }
  });
  
  console.log('Response:', JSON.stringify(data, null, 2));
  if (error) console.error('Error:', error);
}

testSimpleFunction().catch(console.error);

