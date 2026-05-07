-- MITRA Dashboard · Full Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Safely create categories
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('master_admin','admin','district_officer','teacher','content_manager','viewer'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE asset_status AS ENUM ('draft','uploading','processing','review','published','archived','rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE ad_status AS ENUM ('draft','scheduled','live','paused','expiring_soon','expired','archived'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE media_type AS ENUM ('video','image','gif'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE app_status AS ENUM ('building','compiled','live','update_pending','retired'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Core Tables
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       VARCHAR(150) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            user_role NOT NULL DEFAULT 'viewer',
  assigned_state  VARCHAR(100) DEFAULT 'All India',
  assigned_district VARCHAR(100),
  is_active       BOOLEAN DEFAULT TRUE,
  perm_publish_apps    BOOLEAN DEFAULT FALSE,
  perm_upload_unity    BOOLEAN DEFAULT FALSE,
  perm_manage_geo      BOOLEAN DEFAULT FALSE,
  perm_view_analytics  BOOLEAN DEFAULT FALSE,
  perm_create_users    BOOLEAN DEFAULT FALSE,
  perm_edit_curriculum BOOLEAN DEFAULT FALSE,
  perm_approve_content BOOLEAN DEFAULT FALSE,
  perm_export_data     BOOLEAN DEFAULT FALSE,
  perm_manage_ads      BOOLEAN DEFAULT FALSE,
  perm_replay_analytics BOOLEAN DEFAULT FALSE,
  perm_view_dashboard    BOOLEAN DEFAULT FALSE,
  perm_view_curriculum   BOOLEAN DEFAULT FALSE,
  perm_view_controls     BOOLEAN DEFAULT FALSE,
  perm_view_ar_assets    BOOLEAN DEFAULT FALSE,
  perm_view_notif        BOOLEAN DEFAULT FALSE,
  perm_view_users        BOOLEAN DEFAULT FALSE,
  perm_view_legal        BOOLEAN DEFAULT FALSE,
  perm_view_settings     BOOLEAN DEFAULT FALSE,
  perm_delete_users      BOOLEAN DEFAULT FALSE,
  perm_manage_compliance BOOLEAN DEFAULT FALSE,
  perm_view_app_builder  BOOLEAN DEFAULT FALSE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curriculum_nodes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   UUID REFERENCES curriculum_nodes(id) ON DELETE CASCADE,
  node_type   VARCHAR(20) NOT NULL CHECK (node_type IN ('class','subject','topic','language')),
  name        VARCHAR(200) NOT NULL,
  icon        VARCHAR(10) DEFAULT '📘',
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Adding the missing Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id        UUID REFERENCES curriculum_nodes(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS unity_assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  original_name   VARCHAR(255),
  file_path       VARCHAR(512),
  file_size_bytes BIGINT,
  status          asset_status DEFAULT 'draft',
  uploaded_by     UUID REFERENCES users(id),
  reviewed_by     UUID REFERENCES users(id),
  target_apps     TEXT[],
  target_states   TEXT[],
  target_districts TEXT[],
  target_classes  TEXT[],
  target_subjects TEXT[],
  publish_at      TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  restrict_login  BOOLEAN DEFAULT TRUE,
  offline_available BOOLEAN DEFAULT TRUE,
  version         VARCHAR(20) DEFAULT 'v1.0.0',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS state_apps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_name        VARCHAR(150) NOT NULL,
  target_state    VARCHAR(100) NOT NULL,
  version         VARCHAR(20) DEFAULT 'v1.0.0',
  status          app_status DEFAULT 'building',
  active_users    INT DEFAULT 0,
  theme_color     VARCHAR(20) DEFAULT '#6366f1',
  file_path       VARCHAR(512),
  built_by        UUID REFERENCES users(id),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geofences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(200) NOT NULL,
  state           VARCHAR(100) NOT NULL,
  radius_km       INT DEFAULT 50,
  is_active       BOOLEAN DEFAULT TRUE,
  language_lock   VARCHAR(50) DEFAULT 'Follow User Setting',
  offline_only    BOOLEAN DEFAULT FALSE,
  ar_modules      TEXT[],
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── QUIZ QUESTIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id         UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  question_type   VARCHAR(50) DEFAULT 'multiple_choice',
  options         JSONB, 
  correct_answer  TEXT,
  points          INT DEFAULT 1,
  sort_order      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
