const { createClient } = require('@supabase/supabase-js');
const { pdfToPng } = require('pdf-to-png-converter');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://lyppkkpawalcchbgbkxg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cHBra3Bhd2FsY2NoYmdia3hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM3NzEyMSwiZXhwIjoyMDc1OTUzMTIxfQ.QBkICfT_jM_mGyRFhKo143ZkKi8_zrZuixPYVvJGcRs'
);

async function convertAndProcessFNOLs() {
  const userId = 'bd7b3229-c5a4-4cdb-ae91-a41bb572b54d';
  
  const pdfFiles = [
    { name: 'FNOL 45 TX.pdf', id: '87353e18-6b44-43fe-a8b2-8573171b2c99' },
    { name: 'FNOL 46 TX.pdf', id: 'dc60ccc7-0a82-470d-93ab-670ee9ff8305' },
    { name: 'FNOL 47 MO.pdf', id: '955f69d4-5b4f-4b56-853e-5bea7ef60fe2' },
    { name: 'FNOL 48 TN.pdf', id: 'a2c70e3c-b5a8-4ec8-aa39-3008ff9bea86' },
  ];
  
  const tempDir = path.join(__dirname, 'temp_conversion');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  
  for (const pdf of pdfFiles) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Processing: ${pdf.name}`);
    console.log('='.repeat(80));
    
    try {
      // 1. Download PDF from storage
      console.log('1. Downloading PDF from Supabase...');
      const { data: pdfData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(pdf.name);
      
      if (downloadError) {
        console.error(`   ❌ Download failed: ${downloadError.message}`);
        continue;
      }
      
      // 2. Save PDF locally
      const pdfPath = path.join(tempDir, pdf.name);
      const arrayBuffer = await pdfData.arrayBuffer();
      fs.writeFileSync(pdfPath, Buffer.from(arrayBuffer));
      console.log(`   ✅ Downloaded: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);
      
      // 3. Convert PDF to PNG images
      console.log('2. Converting PDF to PNG images...');
      const pngPages = await pdfToPng(pdfPath, {
        outputFolder: tempDir,
        outputFileMask: `${pdf.name.replace('.pdf', '')}_page`
      });
      
      console.log(`   ✅ Converted ${pngPages.length} pages`);
      
      // 4. Create a new claim for this FNOL
      console.log('3. Creating claim...');
      const { data: newClaim, error: claimError } = await supabase
        .from('claims')
        .insert({
          user_id: userId,
          claim_number: `AUTO-${pdf.name.replace('.pdf', '')}`,
          status: 'pending_extraction',
          metadata: { source: 'auto_conversion', original_pdf: pdf.name }
        })
        .select()
        .single();
      
      if (claimError) {
        console.error(`   ❌ Claim creation failed: ${claimError.message}`);
        continue;
      }
      
      console.log(`   ✅ Created claim: ${newClaim.id}`);
      
      // 5. Upload each PNG image and create document records
      console.log('4. Uploading converted images...');
      const imageDocIds = [];
      
      for (let i = 0; i < pngPages.length; i++) {
        const pngPath = pngPages[i].path;
        const pngBuffer = fs.readFileSync(pngPath);
        const storagePath = `documents/${Date.now()}_${pdf.name.replace('.pdf', '')}_page_${i + 1}.png`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, pngBuffer, {
            contentType: 'image/png',
            upsert: false
          });
        
        if (uploadError) {
          console.error(`   ❌ Upload page ${i + 1} failed: ${uploadError.message}`);
          continue;
        }
        
        // Create document record
        const { data: doc, error: docError } = await supabase
          .from('documents')
          .insert({
            claim_id: newClaim.id,
            user_id: userId,
            document_type: 'fnol',
            file_name: `${pdf.name.replace('.pdf', '')}_page_${i + 1}.png`,
            storage_path: storagePath,
            mime_type: 'image/png',
            file_size_bytes: pngBuffer.length,
            extraction_status: 'pending',
            tags: ['fnol', 'auto_converted'],
            metadata: {
              original_pdf: pdf.name,
              page_number: i + 1,
              total_pages: pngPages.length
            }
          })
          .select()
          .single();
        
        if (docError) {
          console.error(`   ❌ Document record failed: ${docError.message}`);
        } else {
          imageDocIds.push(doc.id);
          console.log(`   ✅ Page ${i + 1}: ${doc.id}`);
        }
      }
      
      // 6. Process the first page with FNOL extraction
      if (imageDocIds.length > 0) {
        console.log(`5. Extracting FNOL data from page 1...`);
        
        const { data: extractData, error: extractError } = await supabase.functions.invoke('fnol-extract', {
          body: { documentId: imageDocIds[0], claimId: newClaim.id }
        });
        
        if (extractError) {
          console.error(`   ❌ Extraction failed: ${extractError.message}`);
        } else if (extractData && extractData.success) {
          console.log(`   ✅ FNOL data extracted successfully!`);
          console.log(`   ✅ Claim populated with data`);
          if (extractData.workflowGenerated) {
            console.log(`   ✅ Workflow steps created`);
          }
        } else {
          console.error(`   ❌ Extraction unsuccessful: ${extractData?.error || 'Unknown'}`);
        }
      }
      
      // 7. Mark old PDF document as replaced
      await supabase
        .from('documents')
        .update({
          extraction_status: 'replaced',
          extraction_error: 'Replaced by converted PNG images',
          metadata: { replaced_by_claim: newClaim.id }
        })
        .eq('id', pdf.id);
      
      console.log(`✅ COMPLETED: ${pdf.name}`);
      
    } catch (error) {
      console.error(`❌ Failed to process ${pdf.name}:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('CONVERSION AND PROCESSING COMPLETE');
  console.log('='.repeat(80));
  
  // Cleanup
  console.log('\nCleaning up temp files...');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  console.log('✅ Done!');
}

convertAndProcessFNOLs().catch(console.error);

