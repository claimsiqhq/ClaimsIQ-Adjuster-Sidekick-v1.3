// db/schema.ts
// SQLite schema mirroring Supabase for offline support

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const localClaims = sqliteTable('claims', {
  id: text('id').primaryKey(),
  created_at: integer('created_at').not Null(),
  updated_at: integer('updated_at').notNull(),
  claim_number: text('claim_number'),
  policy_number: text('policy_number'),
  carrier_name: text('carrier_name'),
  insured_name: text('insured_name'),
  insured_phone: text('insured_phone'),
  insured_email: text('insured_email'),
  adjuster_name: text('adjuster_name'),
  adjuster_email: text('adjuster_email'),
  adjuster_phone: text('adjuster_phone'),
  loss_date: text('loss_date'),
  reported_date: text('reported_date'),
  loss_type: text('loss_type'),
  loss_location: text('loss_location'),
  loss_description: text('loss_description'),
  cause_of_loss: text('cause_of_loss'),
  estimated_loss: real('estimated_loss'),
  status: text('status'),
  metadata: text('metadata'), // JSON string
  synced: integer('synced', { mode: 'boolean' }).notNull().default(false),
});

export const localMedia = sqliteTable('media', {
  id: text('id').primaryKey(),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
  claim_id: text('claim_id'),
  user_id: text('user_id'),
  type: text('type').notNull(),
  status: text('status').notNull(),
  label: text('label'),
  local_uri: text('local_uri'), // Local file path
  storage_path: text('storage_path'), // Remote path
  anno_count: integer('anno_count'),
  qc: text('qc'), // JSON string
  annotation_json: text('annotation_json'), // JSON string
  last_error: text('last_error'),
  synced: integer('synced', { mode: 'boolean' }).notNull().default(false),
});

export const localDocuments = sqliteTable('documents', {
  id: text('id').primaryKey(),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
  claim_id: text('claim_id'),
  document_type: text('document_type').notNull(),
  file_name: text('file_name').notNull(),
  local_uri: text('local_uri'), // Local file path
  storage_path: text('storage_path'), // Remote path
  mime_type: text('mime_type'),
  file_size_bytes: integer('file_size_bytes'),
  extracted_data: text('extracted_data'), // JSON string
  extraction_status: text('extraction_status'),
  synced: integer('synced', { mode: 'boolean' }).notNull().default(false),
});

export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  table_name: text('table_name').notNull(),
  operation: text('operation').notNull(), // 'insert', 'update', 'delete'
  record_id: text('record_id').notNull(),
  data: text('data').notNull(), // JSON string
  created_at: integer('created_at').notNull(),
  synced: integer('synced', { mode: 'boolean' }).notNull().default(false),
  error: text('error'),
  retry_count: integer('retry_count').notNull().default(0),
});

