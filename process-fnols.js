const { createClient } = require('@supabase/supabase-js');

// You need the SERVICE ROLE key (starts with eyJ...) for admin access
// This bypasses RLS
const SUPABASE_URL = 'https://lyppkkpawalcchbgbkxg.supabase.co';

// Try with environment variable first
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'NEED_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function processFNOLs() {
  console.log('Fetching documents with service role...\n');
  
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, file_name, extraction_status')
    .eq('document_type', 'fnol')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error fetching documents:', error.message);
    console.log('\n⚠️  You need the SERVICE ROLE KEY (not the publishable key)');
    console.log('Find it in: https://supabase.com/dashboard/project/lyppkkpawalcchbgbkxg/settings/api');
    console.log('Then run: SUPABASE_SERVICE_ROLE_KEY=your_key node process-fnols.js');
    return;
  }
  
  console.log(`✅ Found ${docs.length} FNOL documents:`);
  docs.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.id} - ${doc.file_name} [${doc.extraction_status}]`);
  });
  
  if (docs.length === 0) {
    console.log('\n⚠️  No documents found. Check if the SQL ran successfully in the Supabase dashboard.');
    return;
  }
  
  // Process each document
  console.log('\n🚀 Starting FNOL extraction...\n');
  
  for (const doc of docs) {
    console.log(`Processing ${doc.file_name}...`);
    
    const { data, error } = await supabase.functions.invoke('fnol-extract', {
      body: { documentId: doc.id }
    });
    
    if (error) {
      console.error(`  ❌ Error:`, error.message);
    } else {
      console.log(`  ✅ Success:`, data?.success ? 'Extracted' : 'Failed');
      if (data?.workflowGenerated) {
        console.log(`     Generated workflow with steps`);
      }
    }
    
    // Wait 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ All documents processed!');
  console.log('\nCheck logs at: https://supabase.com/dashboard/project/lyppkkpawalcchbgbkxg/functions/fnol-extract/logs');
}

processFNOLs().catch(console.error);

