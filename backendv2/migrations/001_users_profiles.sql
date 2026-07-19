CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('founder','investor')),
  full_name     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role               TEXT NOT NULL CHECK (role IN ('founder','investor')),
  display_name       TEXT NOT NULL,
  headline           TEXT,
  country            TEXT,
  sectors            TEXT[] NOT NULL DEFAULT '{}',
  regions            TEXT[] NOT NULL DEFAULT '{}',
  website            TEXT,
  avatar_url         TEXT,
  -- founder
  stage              TEXT,
  team_size          INT,
  arr_usd            NUMERIC(18,2),
  funding_ask_usd    NUMERIC(18,2),
  business_model     TEXT,
  -- investor
  investor_type      TEXT,
  stages             TEXT[] NOT NULL DEFAULT '{}',
  check_size_min_usd NUMERIC(18,2),
  check_size_max_usd NUMERIC(18,2),
  -- long-form onboarding answers
  details            JSONB NOT NULL DEFAULT '{}',
  -- founder inside info, visibility-gated
  inside_info        JSONB NOT NULL DEFAULT '{}',
  inside_info_visibility TEXT NOT NULL DEFAULT 'members'
                     CHECK (inside_info_visibility IN ('private','members','public')),
  featured           BOOLEAN NOT NULL DEFAULT false,
  onboarding_raw_text TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_sectors ON profiles USING gin (sectors);
CREATE INDEX idx_profiles_regions ON profiles USING gin (regions);
CREATE INDEX idx_profiles_role_stage ON profiles (role, stage);
CREATE INDEX idx_profiles_featured ON profiles (featured) WHERE featured;
