-- ClaimsIQ Sidekick Database Schema
-- Complete PostgreSQL schema for Supabase

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'adjuster',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Claims table
CREATE TABLE IF NOT EXISTS claims (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    claim_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'in_progress', 'completed', 'closed', 'pending')),
    insured_name VARCHAR(255) NOT NULL,
    insured_phone VARCHAR(50),
    insured_email VARCHAR(255),
    property_address TEXT,
    loss_date DATE,
    loss_type VARCHAR(100),
    loss_description TEXT,
    adjuster_name VARCHAR(255),
    adjuster_email VARCHAR(255),
    adjuster_phone VARCHAR(50),
    policy_number VARCHAR(100),
    deductible DECIMAL(10, 2),
    coverage_limits JSONB,
    metadata JSONB,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media table (photos, videos, LiDAR scans)
CREATE TABLE IF NOT EXISTS media (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('photo', 'video', 'lidar', 'audio')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    label VARCHAR(255),
    description TEXT,
    storage_path TEXT NOT NULL,
    local_uri TEXT,
    thumbnail_path TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    duration DECIMAL(10, 2),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    captured_at TIMESTAMP WITH TIME ZONE,
    camera_make VARCHAR(100),
    camera_model VARCHAR(100),
    tags TEXT[],
    annotation_json JSONB,
    annotation_status VARCHAR(20) DEFAULT 'pending',
    photo_qc JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table (PDFs, reports, FNOLs)
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    storage_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    extraction_status VARCHAR(20) DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
    extracted_data JSONB,
    page_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inspection steps table (workflow items)
CREATE TABLE IF NOT EXISTS inspection_steps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    category VARCHAR(50),
    label VARCHAR(255) NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT true,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    evidence_count INTEGER DEFAULT 0,
    evidence_requirements JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(claim_id, sequence)
);

-- Daily optimizations table (route planning)
CREATE TABLE IF NOT EXISTS daily_optimizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    optimization_date DATE NOT NULL,
    claims_order UUID[],
    total_distance DECIMAL(10, 2),
    estimated_duration INTEGER,
    start_location JSONB,
    end_location JSONB,
    weather_conditions JSONB,
    optimization_params JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, optimization_date)
);

-- App prompts table (AI prompt versioning)
CREATE TABLE IF NOT EXISTS app_prompts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    prompt_text TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(key, version)
);

-- Sync queue table (offline sync)
CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    data JSONB,
    synced BOOLEAN DEFAULT false,
    synced_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_claims_user_id ON claims(user_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_loss_date ON claims(loss_date);
CREATE INDEX idx_media_claim_id ON media(claim_id);
CREATE INDEX idx_media_status ON media(status);
CREATE INDEX idx_media_type ON media(type);
CREATE INDEX idx_documents_claim_id ON documents(claim_id);
CREATE INDEX idx_documents_extraction_status ON documents(extraction_status);
CREATE INDEX idx_inspection_steps_claim_id ON inspection_steps(claim_id);
CREATE INDEX idx_inspection_steps_completed ON inspection_steps(completed);
CREATE INDEX idx_daily_optimizations_user_date ON daily_optimizations(user_id, optimization_date);
CREATE INDEX idx_sync_queue_user_synced ON sync_queue(user_id, synced);

-- Row Level Security (RLS) policies
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for claims
CREATE POLICY "Users can view their own claims" ON claims
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own claims" ON claims
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own claims" ON claims
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for media
CREATE POLICY "Users can view their own media" ON media
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media" ON media
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media" ON media
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for documents
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON documents
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for inspection_steps
CREATE POLICY "Users can view their own inspection steps" ON inspection_steps
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inspection steps" ON inspection_steps
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inspection steps" ON inspection_steps
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for daily_optimizations
CREATE POLICY "Users can view their own optimizations" ON daily_optimizations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own optimizations" ON daily_optimizations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own optimizations" ON daily_optimizations
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Sample app prompts
INSERT INTO app_prompts (key, prompt_text, description) VALUES
('vision_annotate', 'Analyze this insurance claim photo and identify any visible damage. Provide detailed descriptions of damage type, severity (minor/moderate/severe), and location within the image. Return results as structured JSON with bounding boxes.', 'Default prompt for photo damage detection'),
('fnol_extract', 'Extract key information from this First Notice of Loss (FNOL) document. Identify: claim number, policy number, insured name and address, loss date, loss type, loss description, adjuster information, and any other relevant details. Return as structured JSON.', 'Default prompt for FNOL data extraction'),
('workflow_generate', 'Based on this claim information, generate a comprehensive inspection workflow. Include safety checks, exterior inspection, interior inspection, documentation requirements, and mitigation steps. Consider the loss type and create appropriate inspection steps. Return as structured JSON with sequence numbers and evidence requirements.', 'Default prompt for workflow generation'),
('daily_optimize', 'Given these claims and their locations, create an optimized daily route considering distance, priority, and time windows. Factor in traffic patterns and suggest best inspection order. Return optimized sequence with estimated times.', 'Default prompt for daily route optimization')
ON CONFLICT (key, version) DO NOTHING;

-- Create default organization
INSERT INTO organizations (id, name) VALUES 
('00000000-0000-0000-0000-000000000000', 'Default Organization')
ON CONFLICT DO NOTHING;

-- Grant permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON media
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspection_steps_updated_at BEFORE UPDATE ON inspection_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage buckets (run in Supabase Dashboard SQL editor)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

-- Storage policies (run after creating buckets)
-- CREATE POLICY "Users can upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can view media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
-- CREATE POLICY "Users can upload documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can view documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');

COMMENT ON TABLE claims IS 'Insurance claims with all relevant information';
COMMENT ON TABLE media IS 'Photos, videos, and LiDAR scans with AI annotations';
COMMENT ON TABLE documents IS 'PDFs and documents with extraction capabilities';
COMMENT ON TABLE inspection_steps IS 'AI-generated workflow steps for claim inspections';
COMMENT ON TABLE daily_optimizations IS 'Optimized daily routes for field adjusters';
COMMENT ON TABLE app_prompts IS 'Versioned AI prompts for different features';
COMMENT ON TABLE sync_queue IS 'Offline sync queue for mobile app';