-- User Settings and Profiles Table
-- Stores user preferences, profile information, and syncs across devices

-- ============================================================================
-- USER PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- User Info
  email text,
  full_name text,
  phone text,
  avatar_url text,

  -- Organization
  org_id uuid,
  org_name text,
  role text DEFAULT 'adjuster', -- 'admin', 'manager', 'adjuster', 'viewer'

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb
);

-- ============================================================================
-- USER SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Display Preferences
  units text DEFAULT 'imperial', -- 'metric' or 'imperial'
  dark_mode boolean DEFAULT false,
  language text DEFAULT 'en',

  -- Upload & Sync
  wifi_only_uploads boolean DEFAULT true,
  auto_save_photos boolean DEFAULT true,
  high_quality_photos boolean DEFAULT false,
  auto_sync boolean DEFAULT true,
  sync_frequency text DEFAULT 'immediate', -- 'immediate', 'hourly', 'daily'

  -- Reports & Export
  embed_annotations boolean DEFAULT true,
  pdf_template text DEFAULT 'standard', -- 'standard', 'detailed', 'summary'
  include_photos boolean DEFAULT true,
  watermark_pdfs boolean DEFAULT false,

  -- Notifications
  push_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  notify_claim_updates boolean DEFAULT true,
  notify_ai_complete boolean DEFAULT true,
  notify_team_activity boolean DEFAULT false,

  -- Privacy
  share_analytics boolean DEFAULT true,
  offline_mode boolean DEFAULT false,
  auto_delete_old_media boolean DEFAULT false,
  media_retention_days integer DEFAULT 365,

  -- Advanced
  enable_experimental boolean DEFAULT false,
  debug_mode boolean DEFAULT false,

  UNIQUE(user_id)
);

-- ============================================================================
-- ANALYTICS EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),

  -- User & Session
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,

  -- Event Details
  event_type text NOT NULL, -- 'screen_view', 'button_click', 'feature_use', 'error', etc.
  event_name text NOT NULL,
  event_category text, -- 'navigation', 'capture', 'workflow', 'export', etc.

  -- Properties
  properties jsonb DEFAULT '{}'::jsonb,

  -- Device Info
  platform text, -- 'ios', 'android'
  app_version text,
  device_model text,
  os_version text,

  -- Performance
  duration_ms integer,

  -- Context
  screen_name text,
  previous_screen text
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- Auto-create settings on user signup
CREATE OR REPLACE FUNCTION create_settings_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_settings_for_user();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User Settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Analytics Events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own analytics" ON analytics_events;
CREATE POLICY "Users can insert own analytics"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Admins can view all analytics" ON analytics_events;
CREATE POLICY "Admins can view all analytics"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics_events(session_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get user settings with defaults
CREATE OR REPLACE FUNCTION get_user_settings(p_user_id uuid)
RETURNS TABLE (
  units text,
  dark_mode boolean,
  wifi_only_uploads boolean,
  auto_save_photos boolean,
  high_quality_photos boolean,
  embed_annotations boolean,
  push_enabled boolean,
  email_notifications boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(us.units, 'imperial')::text,
    COALESCE(us.dark_mode, false),
    COALESCE(us.wifi_only_uploads, true),
    COALESCE(us.auto_save_photos, true),
    COALESCE(us.high_quality_photos, false),
    COALESCE(us.embed_annotations, true),
    COALESCE(us.push_enabled, true),
    COALESCE(us.email_notifications, true)
  FROM user_settings us
  WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profile information and organization membership';
COMMENT ON TABLE user_settings IS 'User preferences synced across devices';
COMMENT ON TABLE analytics_events IS 'Application usage analytics and telemetry';
COMMENT ON FUNCTION get_user_settings IS 'Get user settings with fallback to defaults';
