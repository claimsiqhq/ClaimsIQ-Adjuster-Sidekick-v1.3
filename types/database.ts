// Database types that match the ACTUAL Supabase schema
// Generated from real Supabase database structure

export interface Claim {
  id: string;
  created_at: string;
  updated_at: string;
  claim_number: string;
  org_id: string | null;
  user_id: string;
  insured_name: string;
  insured_phone: string | null;
  insured_email: string | null;
  loss_date: string;
  reported_date: string | null;
  loss_type: string;
  status: string;
  property_address: string;
  metadata: any | null;
  policy_number: string | null;
  carrier_name: string | null;
  adjuster_name: string | null;
  adjuster_email: string | null;
  adjuster_phone: string | null;
  loss_location: string | null;
  loss_description: string | null;
  cause_of_loss: string | null;
  estimated_loss: string | null;
  time_of_loss: string | null;
  date_prepared: string | null;
  reporter_name: string | null;
  reporter_phone: string | null;
}

export interface MediaItem {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  org_id: string | null;
  claim_id: string | null;
  type: 'photo' | 'video' | 'lidar' | 'audio';
  status: string;
  label: string;
  storage_path: string;
  anno_count: number;
  qc: {
    glare?: boolean;
    blur_score?: number;
    underexposed?: boolean;
    distance_hint_m?: number;
    lat?: number;
    lng?: number;
    captured_at?: string;
  } | null;
  annotation_json: {
    model?: {
      ts: string;
      name: string;
    };
    photo_qc?: any;
    detections?: Array<{
      label: string;
      confidence?: number;
      bbox?: number[];
      severity?: string;
    }>;
  } | null;
  last_error: string | null;
  redaction_json: any | null;
  derived: any | null;
  
  // Not in database but used locally
  local_uri?: string;
}

export interface Document {
  id: string;
  created_at: string;
  updated_at: string;
  claim_id: string;
  user_id: string;
  org_id: string | null;
  document_type: string; // Note: This is 'document_type' not 'type' in actual Supabase
  storage_path: string;
  extraction_status?: string;
  extracted_data?: any;
  // Add other fields as we discover them
}

export interface InspectionStep {
  id: string;
  created_at: string;
  updated_at: string;
  claim_id: string;
  user_id: string;
  sequence: number;
  category: string;
  label: string;
  description?: string;
  required: boolean;
  completed: boolean;
  completed_at?: string | null;
  evidence_count: number;
  evidence_requirements?: any;
  metadata?: any;
}

// Simplified types for creating records (without auto-generated fields)
export type NewMediaItem = Omit<MediaItem, 'id' | 'created_at' | 'updated_at' | 'anno_count'>;
export type NewClaim = Omit<Claim, 'id' | 'created_at' | 'updated_at'>;
export type NewDocument = Omit<Document, 'id' | 'created_at' | 'updated_at'>;
export type NewInspectionStep = Omit<InspectionStep, 'id' | 'created_at' | 'updated_at'>;