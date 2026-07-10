-- Liberty Echo Firebase → Supabase migration
-- Run this migration after creating the Supabase project

-- 1. Voice clone consents (GDPR Art. 9)
CREATE TABLE IF NOT EXISTS voice_clone_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  consent_version TEXT DEFAULT '1.0',
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  ip_address TEXT,
  user_agent TEXT
);

ALTER TABLE voice_clone_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own consents" ON voice_clone_consents
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own consents" ON voice_clone_consents
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 2. User entitlements (plan tier, features)
CREATE TABLE IF NOT EXISTS user_entitlements (
  user_id TEXT PRIMARY KEY,
  plan_tier TEXT DEFAULT 'free' CHECK (plan_tier IN ('free', 'starter', 'creator', 'pro', 'scale', 'business')),
  stripe_customer_id TEXT UNIQUE,
  features JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own entitlements" ON user_entitlements
  FOR SELECT USING (auth.uid()::text = user_id);

-- 3. Session history (Firebase → Supabase)
CREATE TABLE IF NOT EXISTS session_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE session_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own history" ON session_history
  FOR SELECT USING (auth.uid()::text = user_id);

-- 4. User memories (Firebase → Supabase)
CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own memories" ON user_memories
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own memories" ON user_memories
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 5. Voice profiles (storage, metadata)
CREATE TABLE IF NOT EXISTS voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  embedding VECTOR(256),
  consent_id UUID REFERENCES voice_clone_consents(id),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own voices" ON voice_profiles
  FOR SELECT USING (auth.uid()::text = user_id);

-- 6. Compliance audit logs (GDPR)
CREATE TABLE IF NOT EXISTS compliance_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE compliance_audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. API usage tracking (metered billing)
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  endpoint TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own usage" ON api_usage
  FOR SELECT USING (auth.uid()::text = user_id);

-- Indexes
CREATE INDEX idx_voice_clone_consents_user ON voice_clone_consents(user_id);
CREATE INDEX idx_session_history_user ON session_history(user_id);
CREATE INDEX idx_user_memories_user ON user_memories(user_id);
CREATE INDEX idx_voice_profiles_user ON voice_profiles(user_id);
CREATE INDEX idx_api_usage_user ON api_usage(user_id);
