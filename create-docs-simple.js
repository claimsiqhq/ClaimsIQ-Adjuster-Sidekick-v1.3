const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lyppkkpawalcchbgbkxg.supabase.co',
  'sb_publishable_xG1vNYVo-wpyHi4WzCdUGg_9XFL8Gxr'
);

async function createDocumentRecords() {
  const files = [
    'FNOL 45 TX.pdf',
    'FNOL 47 MO.pdf',
    'FNOL 48 TN.pdf',
    'FNOL 46 TX.pdf'
  ];
  
  console.log('Creating document records...');
  
  for (const fileName of files) {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        file_name: fileName,
        storage_path: fileName,
        mime_type: 'application/pdf',
        extraction_status: 'pending'
      })
      .select()
      .single();
    
    if (error) {
      console.error(`Error creating record for ${fileName}:`, error.message);
    } else {
      console.log(`✅ Created: ${data.id} - ${fileName}`);
    }
  }
  
  // Verify
  const { data: docs } = await supabase
    .from('documents')
    .select('id, file_name, extraction_status')
    .order('created_at', { ascending: false });
  
  console.log(`\n✅ Total documents: ${docs.length}`);
  return docs;
}

createDocumentRecords()
  .then(docs => {
    if (docs && docs.length > 0) {
      console.log('\nDocument IDs to process:');
      docs.forEach(doc => console.log(`  ${doc.id}`));
    }
  })
  .catch(console.error);

