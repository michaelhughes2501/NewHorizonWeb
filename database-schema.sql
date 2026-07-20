-- ═══════════════════════════════════════════════════════════════════════════════
-- NEW HORIZON — COMPLETE DATABASE SCHEMA (Supabase / PostgreSQL)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Run this in Supabase SQL Editor to set up the entire database
-- Enable Row Level Security (RLS) on every table
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── EXTENSIONS ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS / PROFILES ─────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id         UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  avatar          TEXT,                          -- initials fallback
  avatar_url      TEXT,                          -- uploaded photo URL
  age             INT CHECK (age >= 18 AND age <= 120),
  state           TEXT,
  bio             TEXT CHECK (char_length(bio) <= 500),
  offense_type    TEXT DEFAULT 'Prefer not to say'
                  CHECK (offense_type IN ('Non-violent','Drug offense','Financial','Violent','Prefer not to say')),
  release_year    INT,
  interests       TEXT[] DEFAULT '{}',
  is_verified     BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  is_banned       BOOLEAN DEFAULT FALSE,
  ban_reason      TEXT,
  push_token      TEXT,                          -- Expo push token
  public_profile  BOOLEAN DEFAULT TRUE,
  show_state      BOOLEAN DEFAULT TRUE,
  email_notifs    BOOLEAN DEFAULT TRUE,
  push_notifs     BOOLEAN DEFAULT TRUE,
  last_seen       TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CONNECTIONS (Likes / Matches) ────────────────────────────────────────────
CREATE TABLE connections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'pending'
              CHECK (status IN ('pending','matched','blocked')),
  liked_at    TIMESTAMPTZ DEFAULT NOW(),
  matched_at  TIMESTAMPTZ,
  UNIQUE(user_a, user_b),
  CHECK (user_a <> user_b)
);

-- ─── MESSAGES ─────────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL,               -- hash of sorted user IDs
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL CHECK (char_length(content) <= 2000),
  read            BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  deleted_by_sender    BOOLEAN DEFAULT FALSE,
  deleted_by_recipient BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_recipient ON messages(recipient_id, read);

-- ─── JOBS ─────────────────────────────────────────────────────────────────────
CREATE TABLE jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  company         TEXT NOT NULL,
  location        TEXT NOT NULL,
  state           TEXT,
  job_type        TEXT CHECK (job_type IN ('Full-time','Part-time','Contract','Temporary')),
  wage_min        DECIMAL(8,2),
  wage_max        DECIMAL(8,2),
  wage_display    TEXT,
  description     TEXT,
  requirements    TEXT,
  logo_emoji      TEXT DEFAULT '💼',
  external_url    TEXT,
  felony_friendly BOOLEAN DEFAULT TRUE,
  ban_the_box     BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  is_approved     BOOLEAN DEFAULT FALSE,        -- admin must approve
  posted_by       UUID REFERENCES profiles(id),
  applications    INT DEFAULT 0,
  views           INT DEFAULT 0,
  tags            TEXT[] DEFAULT '{}',
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '60 days',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_jobs_state ON jobs(state, is_active, is_approved);
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);

-- ─── JOB APPLICATIONS ─────────────────────────────────────────────────────────
CREATE TABLE job_applications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cover_note  TEXT,
  phone       TEXT,
  status      TEXT DEFAULT 'submitted'
              CHECK (status IN ('submitted','viewed','interview','offered','rejected','withdrawn')),
  applied_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, user_id)
);

-- ─── RESOURCES ────────────────────────────────────────────────────────────────
CREATE TABLE resources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('parole','mental','housing','education','legal','employment')),
  url         TEXT,
  phone       TEXT,
  description TEXT,
  state       TEXT,                             -- NULL = national
  is_urgent   BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  tag         TEXT,
  icon        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BLOG POSTS ───────────────────────────────────────────────────────────────
CREATE TABLE blog_posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  excerpt     TEXT CHECK (char_length(excerpt) <= 300),
  category    TEXT CHECK (category IN ('Story','Legal','Jobs','Mental Health','Business','Housing')),
  icon        TEXT DEFAULT '📝',
  tags        TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,            -- admin must approve
  views       INT DEFAULT 0,
  likes       INT DEFAULT 0,
  read_time   INT,                              -- minutes
  published_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_blog_published ON blog_posts(is_published, is_approved, published_at DESC);

-- ─── BLOG LIKES ───────────────────────────────────────────────────────────────
CREATE TABLE blog_likes (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  liked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('match','message','job','resource','system','admin')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  icon        TEXT DEFAULT '🔔',
  data        JSONB DEFAULT '{}',              -- extra payload
  read        BOOLEAN DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  action_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifs_user ON notifications(user_id, read, created_at DESC);

-- ─── SAVED JOBS ───────────────────────────────────────────────────────────────
CREATE TABLE saved_jobs (
  user_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id   UUID REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, job_id)
);

-- ─── REPORTS ──────────────────────────────────────────────────────────────────
CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_type   TEXT CHECK (target_type IN ('user','message','post','job')),
  target_id     UUID NOT NULL,
  reason        TEXT NOT NULL,
  details       TEXT,
  status        TEXT DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  reviewed_by   UUID REFERENCES profiles(id),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ADMIN AUDIT LOG ──────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   UUID,
  before_data JSONB,
  after_data  JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_likes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read public profiles, edit only their own
CREATE POLICY "public profiles viewable" ON profiles FOR SELECT USING (public_profile = TRUE AND is_banned = FALSE);
CREATE POLICY "own profile" ON profiles FOR ALL USING (auth.uid() = auth_id);

-- Messages: only sender/recipient
CREATE POLICY "own messages" ON messages FOR ALL USING (auth.uid()::TEXT IN (
  SELECT auth_id::TEXT FROM profiles WHERE id = sender_id OR id = recipient_id
));

-- Notifications: own only
CREATE POLICY "own notifications" ON notifications FOR ALL USING (
  user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
);

-- Job applications: own only
CREATE POLICY "own applications" ON job_applications FOR ALL USING (
  user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
);

-- Jobs: anyone can read approved active jobs
CREATE POLICY "read approved jobs" ON jobs FOR SELECT USING (is_active = TRUE AND is_approved = TRUE);

-- Blog: anyone can read published approved posts
CREATE POLICY "read published posts" ON blog_posts FOR SELECT USING (is_published = TRUE AND is_approved = TRUE);

-- Blog likes: anyone authenticated can read; users manage their own
CREATE POLICY "read blog likes" ON blog_likes FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "own blog likes" ON blog_likes FOR ALL USING (
  user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
);

-- Saved jobs: own only
CREATE POLICY "own saved jobs" ON saved_jobs FOR ALL USING (
  user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at  BEFORE UPDATE ON profiles  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER jobs_updated_at      BEFORE UPDATE ON jobs       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER posts_updated_at     BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-match when both users like each other
CREATE OR REPLACE FUNCTION check_mutual_like()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM connections WHERE user_a = NEW.user_b AND user_b = NEW.user_a AND status = 'pending') THEN
    UPDATE connections SET status = 'matched', matched_at = NOW()
    WHERE (user_a = NEW.user_b AND user_b = NEW.user_a) OR (user_a = NEW.user_a AND user_b = NEW.user_b);
    -- Insert match notifications for both users
    INSERT INTO notifications (user_id, type, title, body, icon, data)
    VALUES
      (NEW.user_a, 'match', 'It''s a Match! 🎉', 'You and another member matched. Say hello!', '♥', json_build_object('match_id', NEW.user_b)),
      (NEW.user_b, 'match', 'It''s a Match! 🎉', 'You and another member matched. Say hello!', '♥', json_build_object('match_id', NEW.user_a));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_match AFTER INSERT ON connections FOR EACH ROW EXECUTE FUNCTION check_mutual_like();

-- Notify on new message
CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS TRIGGER AS $$
DECLARE recipient_name TEXT;
BEGIN
  SELECT name INTO recipient_name FROM profiles WHERE id = NEW.sender_id;
  INSERT INTO notifications (user_id, type, title, body, icon, data)
  VALUES (NEW.recipient_id, 'message', 'New Message', recipient_name || ' sent you a message', '✉',
    json_build_object('sender_id', NEW.sender_id, 'conversation_id', NEW.conversation_id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_notification AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION notify_on_message();

-- Increment job application count
CREATE OR REPLACE FUNCTION increment_job_apps()
RETURNS TRIGGER AS $$
BEGIN UPDATE jobs SET applications = applications + 1 WHERE id = NEW.job_id; RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_app_count AFTER INSERT ON job_applications FOR EACH ROW EXECUTE FUNCTION increment_job_apps();

-- Increment blog post likes counter. Called from BlogService.likePost via RPC.
CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE blog_posts SET likes = likes + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO resources (name, category, url, phone, description, state, is_urgent, is_approved, tag, icon) VALUES
  ('SAMHSA National Helpline', 'mental', 'https://www.samhsa.gov/find-help/national-helpline', '1-800-662-4357', 'Free, confidential 24/7 treatment referral service.', NULL, TRUE, TRUE, '24/7 Free', '📞'),
  ('Crisis Text Line', 'mental', 'https://www.crisistextline.org', NULL, 'Text HOME to 741741. Free crisis counseling anytime.', NULL, TRUE, TRUE, '24/7 Text', '💬'),
  ('988 Suicide & Crisis Lifeline', 'mental', 'https://988lifeline.org', '988', 'Call or text 988. Chat available online.', NULL, TRUE, TRUE, 'Emergency', '🆘'),
  ('National Parole Resource Center', 'parole', 'https://nationalparoleresource.org', NULL, 'State-by-state guidelines, rights, and parole board contacts.', NULL, FALSE, TRUE, 'Federal', '⚖️'),
  ('HUD Reentry Housing Program', 'housing', 'https://www.hud.gov/reentry', NULL, 'Federal rental and transitional housing assistance.', NULL, FALSE, TRUE, 'Federal', '🏠'),
  ('Pell Grants for Incarcerated', 'education', 'https://studentaid.gov/understand-aid/types/grants/pell', NULL, 'Pell Grant eligibility restored for formerly incarcerated students.', NULL, FALSE, TRUE, 'Federal Aid', '🎓'),
  ('Defy Ventures', 'employment', 'https://defyventures.org', NULL, 'Entrepreneurship, employment, and character training for returning citizens.', NULL, FALSE, TRUE, 'Business', '💡'),
  ('Restore Justice Foundation', 'legal', 'https://restorejustice.org', NULL, 'Legal aid, expungement help, and parole board preparation.', NULL, FALSE, TRUE, 'Nonprofit', '🔓');

INSERT INTO jobs (title, company, location, state, job_type, wage_display, description, logo_emoji, felony_friendly, ban_the_box, is_active, is_approved, tags) VALUES
  ('Warehouse Associate', 'Amazon Logistics', 'Dallas, TX', 'TX', 'Full-time', '$18–$21/hr', 'No background disqualification for non-violent offenses. Benefits from day 1.', '📦', TRUE, TRUE, TRUE, TRUE, ARRAY['Physical','Benefits','Team']),
  ('Electrician Apprentice', 'City Electric Co.', 'Orlando, FL', 'FL', 'Full-time', '$22–$26/hr', 'Union job. Learn the trade under licensed electricians.', '⚡', TRUE, FALSE, TRUE, TRUE, ARRAY['Trade','Union','Growth']),
  ('Culinary Assistant', 'Fresh Start Kitchens', 'Atlanta, GA', 'GA', 'Part-time', '$15–$17/hr', 'Founded by formerly incarcerated chefs. All backgrounds welcome.', '🍳', TRUE, TRUE, TRUE, TRUE, ARRAY['Nonprofit','Flexible','Community']),
  ('Remote Data Entry Clerk', 'RemoteWork Inc.', 'Remote', 'Remote', 'Part-time', '$14–$16/hr', 'Fully remote. Laptop provided. Ideal for parole restrictions.', '💻', TRUE, TRUE, TRUE, TRUE, ARRAY['Remote','Flexible','WFH']);
