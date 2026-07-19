CREATE TABLE meetings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id     UUID NOT NULL REFERENCES users(id),
  recipient_user_id     UUID NOT NULL REFERENCES users(id),
  status                TEXT NOT NULL DEFAULT 'requested'
                        CHECK (status IN ('requested','accepted','declined','cancelled','completed')),
  message               TEXT,
  scheduled_at          TIMESTAMPTZ,
  duration_min          INT NOT NULL DEFAULT 45,
  meeting_link          TEXT,
  decline_reason        TEXT,
  feedback_requested_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meetings_recipient ON meetings (recipient_user_id, status);
CREATE INDEX idx_meetings_requester ON meetings (requester_user_id, status);
CREATE INDEX idx_meetings_sweep ON meetings (status, scheduled_at);

CREATE TABLE meeting_slots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES users(id),
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  is_selected BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_slots_meeting ON meeting_slots (meeting_id);

CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT,
  data         JSONB NOT NULL DEFAULT '{}',
  read_at      TIMESTAMPTZ,
  email_status TEXT NOT NULL DEFAULT 'skipped'
               CHECK (email_status IN ('skipped','sent','failed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE read_at IS NULL;

CREATE TABLE feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id    UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  from_user_id  UUID NOT NULL REFERENCES users(id),
  about_user_id UUID NOT NULL REFERENCES users(id),
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  would_proceed BOOLEAN,
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, from_user_id)
);

CREATE INDEX idx_feedback_about ON feedback (about_user_id);
