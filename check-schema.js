const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lyppkkpawalcchbgbkxg.supabase.co',
  'sb_publishable_xG1vNYVo-wpyHi4WzCdUGg_9XFL8Gxr'
);

async function checkSchema() {
  console.log('Checking documents table schema...\n');
  
  // Try to get one row to see available columns
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error querying documents:', error.message);
  } else if (data && data.length > 0) {
    console.log('Available columns:', Object.keys(data[0]));
  } else {
    console.log('Table is empty - trying other tables...');
    
    // Check claims table
    const { data: claims } = await supabase
      .from('claims')
      .select('*')
      .limit(1);
    
    if (claims && claims.length > 0) {
      console.log('\nClaims table columns:', Object.keys(claims[0]));
    }
  }
}

checkSchema().catch(console.error);

