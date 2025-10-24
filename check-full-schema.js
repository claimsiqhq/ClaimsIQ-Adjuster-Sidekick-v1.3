const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lyppkkpawalcchbgbkxg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cHBra3Bhd2FsY2NoYmdia3hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM3NzEyMSwiZXhwIjoyMDc1OTUzMTIxfQ.QBkICfT_jM_mGyRFhKo143ZkKi8_zrZuixPYVvJGcRs'
);

async function checkSchema() {
  console.log('=== CLAIMS TABLE COLUMNS ===');
  const { data: claims } = await supabase.from('claims').select('*').limit(1);
  if (claims && claims.length > 0) {
    const columns = Object.keys(claims[0]);
    console.log(`Total columns: ${columns.length}`);
    columns.forEach(col => console.log(`  - ${col}`));
  } else {
    console.log('No claims data to inspect columns');
  }
  
  console.log('\n=== DOCUMENTS TABLE COLUMNS ===');
  const { data: docs } = await supabase.from('documents').select('*').limit(1);
  if (docs && docs.length > 0) {
    const columns = Object.keys(docs[0]);
    console.log(`Total columns: ${columns.length}`);
    columns.forEach(col => console.log(`  - ${col}`));
  } else {
    console.log('No documents data to inspect columns');
  }
  
  console.log('\n=== INSPECTION_STEPS TABLE COLUMNS ===');
  const { data: steps } = await supabase.from('inspection_steps').select('*').limit(1);
  if (steps && steps.length > 0) {
    const columns = Object.keys(steps[0]);
    console.log(`Total columns: ${columns.length}`);
    columns.forEach(col => console.log(`  - ${col}`));
  } else {
    console.log('No inspection_steps data to inspect columns');
  }
}

checkSchema().catch(console.error);

