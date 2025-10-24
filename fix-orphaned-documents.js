const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lyppkkpawalcchbgbkxg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cHBra3Bhd2FsY2NoYmdia3hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM3NzEyMSwiZXhwIjoyMDc1OTUzMTIxfQ.QBkICfT_jM_mGyRFhKo143ZkKi8_zrZuixPYVvJGcRs'
);

async function fixOrphanedDocuments() {
  console.log('=== FIXING ORPHANED DOCUMENTS ===\n');
  
  // Get user ID
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  const userId = profiles && profiles[0] ? profiles[0].id : null;
  
  if (!userId) {
    console.error('No user found in profiles table!');
    return;
  }
  
  console.log(`Using user_id: ${userId}\n`);
  
  // Get all documents with NULL user_id or claim_id
  const { data: docs, error } = await supabase
    .from('documents')
    .select('*')
    .or('user_id.is.null,claim_id.is.null');
  
  if (error) {
    console.error('Error fetching documents:', error);
    return;
  }
  
  console.log(`Found ${docs.length} orphaned documents\n`);
  
  for (const doc of docs) {
    console.log(`Document: ${doc.file_name}`);
    console.log(`  ID: ${doc.id}`);
    console.log(`  Type: ${doc.document_type}`);
    console.log(`  user_id: ${doc.user_id || 'NULL'}`);
    console.log(`  claim_id: ${doc.claim_id || 'NULL'}`);
    console.log(`  Status: ${doc.extraction_status}`);
    
    // Update to add user_id
    const update = {};
    
    if (!doc.user_id) {
      update.user_id = userId;
    }
    
    if (Object.keys(update).length > 0) {
      const { error: updateError } = await supabase
        .from('documents')
        .update(update)
        .eq('id', doc.id);
      
      if (updateError) {
        console.log(`  ❌ Update failed: ${updateError.message}`);
      } else {
        console.log(`  ✅ Updated: user_id=${userId}`);
      }
    }
    
    console.log('');
  }
  
  // Now try to process the FNOLs
  console.log('\n=== PROCESSING FNOLs ===\n');
  
  const { data: fnolDocs } = await supabase
    .from('documents')
    .select('*')
    .eq('document_type', 'fnol')
    .in('extraction_status', ['pending', 'processing'])
    .limit(4);
  
  console.log(`Found ${fnolDocs?.length || 0} FNOLs to process\n`);
  
  if (!fnolDocs || fnolDocs.length === 0) {
    console.log('No FNOLs need processing');
    return;
  }
  
  for (const doc of fnolDocs) {
    console.log(`Processing: ${doc.file_name}`);
    console.log(`  Document ID: ${doc.id}`);
    
    // First, need to convert PDF to image
    // Since edge function can't handle PDFs, we need images
    if (doc.mime_type === 'application/pdf') {
      console.log(`  ⚠️  PDF format - needs conversion to images first`);
      console.log(`  ⚠️  Upload through the app to auto-convert`);
      console.log('');
      continue;
    }
    
    // If it's an image, try to process it
    console.log(`  Invoking fnol-extract...`);
    
    const { data, error } = await supabase.functions.invoke('fnol-extract', {
      body: { documentId: doc.id }
    });
    
    if (error) {
      console.log(`  ❌ Extraction failed: ${error.message}`);
    } else if (data && data.success) {
      console.log(`  ✅ Extraction successful!`);
      if (data.claimId) {
        console.log(`  ✅ Claim created: ${data.claimId}`);
      }
    } else {
      console.log(`  ❌ Extraction unsuccessful: ${data?.error || 'Unknown error'}`);
    }
    
    console.log('');
  }
}

fixOrphanedDocuments().catch(console.error);

