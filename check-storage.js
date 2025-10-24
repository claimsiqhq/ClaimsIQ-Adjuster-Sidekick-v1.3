const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lyppkkpawalcchbgbkxg.supabase.co',
  'sb_publishable_xG1vNYVo-wpyHi4WzCdUGg_9XFL8Gxr'
);

async function checkStorage() {
  console.log('Checking storage buckets...');
  
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error('Error listing buckets:', bucketsError);
    return;
  }
  
  console.log(`Found ${buckets.length} buckets:`, buckets.map(b => b.name));
  
  // Check documents bucket
  const { data: files, error: filesError } = await supabase.storage
    .from('documents')
    .list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' }
    });
  
  if (filesError) {
    console.error('Error listing files:', filesError);
    return;
  }
  
  console.log(`\nFound ${files.length} files in 'documents' bucket:`);
  files.forEach((file, i) => {
    console.log(`${i + 1}. ${file.name} (${file.metadata?.size || 0} bytes, created: ${file.created_at})`);
  });
}

checkStorage().catch(console.error);

