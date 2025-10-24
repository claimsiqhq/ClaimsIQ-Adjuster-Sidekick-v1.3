const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { convert } = require('pdf-poppler');

const supabase = createClient(
  'https://lyppkkpawalcchbgbkxg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cHBra3Bhd2FsY2NoYmdia3hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM3NzEyMSwiZXhwIjoyMDc1OTUzMTIxfQ.QBkICfT_jM_mGyRFhKo143ZkKi8_zrZuixPYVvJGcRs'
);

async function convertPDFsToImages() {
  // Create temp directory
  const tempDir = path.join(__dirname, 'temp_pdfs');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const pdfFiles = [
    'FNOL 45 TX.pdf',
    'FNOL 47 MO.pdf',
    'FNOL 48 TN.pdf',
    'FNOL 46 TX.pdf'
  ];

  for (const pdfFile of pdfFiles) {
    console.log(`\n=== Processing ${pdfFile} ===`);
    
    // 1. Download PDF from Supabase storage
    console.log('Downloading PDF...');
    const { data, error } = await supabase.storage
      .from('documents')
      .download(pdfFile);
    
    if (error || !data) {
      console.error(`Error downloading ${pdfFile}:`, error);
      continue;
    }
    
    // 2. Save PDF locally
    const pdfPath = path.join(tempDir, pdfFile);
    const arrayBuffer = await data.arrayBuffer();
    fs.writeFileSync(pdfPath, Buffer.from(arrayBuffer));
    console.log(`Saved to ${pdfPath}`);
    
    // 3. Convert PDF to images using pdf-poppler
    console.log('Converting PDF to images...');
    const outputDir = path.join(tempDir, pdfFile.replace('.pdf', ''));
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    const opts = {
      format: 'png',
      out_dir: outputDir,
      out_prefix: path.basename(pdfFile, '.pdf'),
      page: null // Convert all pages
    };
    
    try {
      await convert(pdfPath, opts);
      console.log(`Converted successfully to ${outputDir}`);
      
      // 4. Upload images to Supabase storage
      const imageFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.png'));
      console.log(`Found ${imageFiles.length} images`);
      
      for (const imageFile of imageFiles) {
        const imagePath = path.join(outputDir, imageFile);
        const imageBuffer = fs.readFileSync(imagePath);
        const storagePath = `${pdfFile.replace('.pdf', '')}_${imageFile}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, imageBuffer, {
            contentType: 'image/png',
            upsert: true
          });
        
        if (uploadError) {
          console.error(`Error uploading ${imageFile}:`, uploadError);
        } else {
          console.log(`✅ Uploaded: ${storagePath}`);
          
          // 5. Create document record
          const { error: dbError } = await supabase
            .from('documents')
            .insert({
              file_name: storagePath,
              storage_path: storagePath,
              mime_type: 'image/png',
              document_type: 'fnol',
              extraction_status: 'pending'
            });
          
          if (dbError) {
            console.error(`Error creating DB record:`, dbError);
          } else {
            console.log(`✅ Created DB record for ${storagePath}`);
          }
        }
      }
    } catch (convError) {
      console.error(`Error converting ${pdfFile}:`, convError.message);
    }
  }
  
  console.log('\n✅ PDF conversion complete!');
  console.log('Cleaning up temp files...');
  // fs.rmSync(tempDir, { recursive: true, force: true });
}

convertPDFsToImages().catch(console.error);

