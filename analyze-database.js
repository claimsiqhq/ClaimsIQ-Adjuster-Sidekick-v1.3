const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lyppkkpawalcchbgbkxg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cHBra3Bhd2FsY2NoYmdia3hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM3NzEyMSwiZXhwIjoyMDc1OTUzMTIxfQ.QBkICfT_jM_mGyRFhKo143ZkKi8_zrZuixPYVvJGcRs'
);

async function deepDiveDatabase() {
  console.log('='.repeat(80));
  console.log('COMPLETE DATABASE ANALYSIS');
  console.log('='.repeat(80));
  
  // 1. Get all table names
  const tables = [
    'claims',
    'documents', 
    'media',
    'inspection_steps',
    'workflows',
    'app_prompts',
    'users',
    'profiles',
    'organizations'
  ];
  
  for (const tableName of tables) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TABLE: ${tableName.toUpperCase()}`);
    console.log('='.repeat(80));
    
    try {
      // Get one row to inspect columns
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        console.log(`❌ Error accessing table: ${error.message}`);
        console.log(`   Code: ${error.code}`);
        console.log(`   Details: ${error.details}`);
        console.log(`   Hint: ${error.hint}`);
        continue;
      }
      
      // Get row count
      const { count: totalCount } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      console.log(`\nRow count: ${totalCount || 0}`);
      
      if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log(`\nColumns (${columns.length}):`);
        
        // Show each column with its current value type
        columns.forEach(col => {
          const value = data[0][col];
          const type = value === null ? 'null' : typeof value;
          const sample = value === null ? 'NULL' : 
                        typeof value === 'object' ? JSON.stringify(value).slice(0, 50) :
                        String(value).slice(0, 50);
          console.log(`  ${col.padEnd(30)} ${type.padEnd(10)} ${sample}`);
        });
      } else {
        console.log('\nNo data in table - cannot inspect column types');
        console.log('Attempting to describe table structure...');
        
        // Try to insert empty row to see required columns
        const { error: insertError } = await supabase
          .from(tableName)
          .insert({})
          .select();
        
        if (insertError) {
          console.log(`Required columns error: ${insertError.message}`);
        }
      }
    } catch (err) {
      console.log(`❌ Failed to analyze ${tableName}:`, err.message);
    }
  }
  
  // 2. Check storage buckets
  console.log(`\n${'='.repeat(80)}`);
  console.log('STORAGE BUCKETS');
  console.log('='.repeat(80));
  
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.log('❌ Error listing buckets:', bucketsError.message);
  } else {
    console.log(`\nFound ${buckets.length} buckets:\n`);
    
    for (const bucket of buckets) {
      console.log(`Bucket: ${bucket.name}`);
      console.log(`  ID: ${bucket.id}`);
      console.log(`  Public: ${bucket.public}`);
      console.log(`  Created: ${bucket.created_at}`);
      
      // List files in bucket
      const { data: files, error: filesError } = await supabase.storage
        .from(bucket.name)
        .list('', { limit: 100 });
      
      if (!filesError && files) {
        console.log(`  Files: ${files.length}`);
        files.slice(0, 5).forEach(f => {
          console.log(`    - ${f.name} (${f.metadata?.size || 0} bytes)`);
        });
        if (files.length > 5) {
          console.log(`    ... and ${files.length - 5} more`);
        }
      }
      console.log('');
    }
  }
  
  // 3. Check edge functions
  console.log('='.repeat(80));
  console.log('EDGE FUNCTIONS STATUS');
  console.log('='.repeat(80));
  
  const edgeFunctions = [
    'fnol-extract',
    'vision-annotate',
    'workflow-generate',
    'daily-optimize'
  ];
  
  for (const funcName of edgeFunctions) {
    try {
      const { data, error } = await supabase.functions.invoke(funcName, {
        body: { test: true }
      });
      
      if (error) {
        console.log(`\n${funcName}: ❌ ERROR`);
        console.log(`  Message: ${error.message}`);
      } else {
        console.log(`\n${funcName}: ✅ DEPLOYED`);
        console.log(`  Response: ${JSON.stringify(data).slice(0, 100)}...`);
      }
    } catch (err) {
      console.log(`\n${funcName}: ❌ NOT DEPLOYED OR FAILED`);
      console.log(`  Error: ${err.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(80));
}

deepDiveDatabase().catch(console.error);

