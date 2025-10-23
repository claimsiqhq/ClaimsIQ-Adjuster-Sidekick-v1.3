#!/usr/bin/env node
// Extract the complete schema from Supabase to ensure code matches

const fetch = require('node-fetch');

const SUPABASE_URL = 'https://lyppkkpawalcchbgbkxg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xG1vNYVo-wpyHi4WzCdUGg_9XFL8Gxr';

async function extractSchema() {
  console.log('=== EXTRACTING SUPABASE SCHEMA ===\n');
  
  try {
    // Authenticate
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'john@claimsiq.ai',
        password: 'admin123',
      }),
    });
    
    const authData = await authResponse.json();
    const accessToken = authData.access_token;
    console.log('✅ Authenticated\n');
    
    const tables = ['claims', 'media', 'documents', 'inspection_steps'];
    const schema = {};
    
    for (const table of tables) {
      console.log(`\n=== ${table.toUpperCase()} TABLE ===`);
      
      // Try to get a sample record to understand structure
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.length > 0) {
          // We have data, extract column names and types
          const columns = Object.keys(data[0]);
          schema[table] = {};
          
          console.log('Columns found:');
          columns.forEach(col => {
            const value = data[0][col];
            const type = value === null ? 'unknown' : typeof value;
            schema[table][col] = { type, sample: value };
            console.log(`  - ${col}: ${type}${value === null ? ' (null)' : ''}`);
          });
        } else {
          // No data, try to insert to get error message about required fields
          console.log('No data in table. Testing required fields...');
          
          const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          });
          
          const error = await testResponse.text();
          // Parse error to understand required columns
          if (error.includes('null value in column')) {
            const match = error.match(/null value in column "([^"]+)"/);
            if (match) {
              console.log(`  Required field found: ${match[1]}`);
            }
          }
          console.log('  Error details:', error.slice(0, 200));
        }
      } else {
        console.log('❌ Table does not exist or access denied');
      }
    }
    
    // Save schema to file
    const fs = require('fs');
    fs.writeFileSync('supabase-actual-schema.json', JSON.stringify(schema, null, 2));
    console.log('\n\n✅ Schema extracted to supabase-actual-schema.json');
    
    // Generate TypeScript types
    let typeDefinitions = '// Generated from actual Supabase schema\n\n';
    
    for (const [tableName, columns] of Object.entries(schema)) {
      const interfaceName = tableName.slice(0, -1).charAt(0).toUpperCase() + tableName.slice(1, -1);
      typeDefinitions += `export interface ${interfaceName} {\n`;
      
      for (const [colName, colInfo] of Object.entries(columns)) {
        let tsType = 'any';
        if (colInfo.type === 'string') tsType = 'string';
        else if (colInfo.type === 'number') tsType = 'number';
        else if (colInfo.type === 'boolean') tsType = 'boolean';
        else if (colInfo.type === 'object') tsType = 'any';
        
        const nullable = colInfo.sample === null ? ' | null' : '';
        typeDefinitions += `  ${colName}: ${tsType}${nullable};\n`;
      }
      
      typeDefinitions += '}\n\n';
    }
    
    fs.writeFileSync('types/supabase-actual.ts', typeDefinitions);
    console.log('✅ TypeScript types generated in types/supabase-actual.ts');
    
    return schema;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

extractSchema().catch(console.error);